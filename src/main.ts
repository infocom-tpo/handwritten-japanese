import * as tf from '@tensorflow/tfjs';
import Konva from 'konva';

const characters = require('./scut_ept_char_list.json') as string[];
let lineHeightMin = 0;
let lineHeightMax = 0;
let lineWidthMin = 0;
let lineWidthMax = 0;
let model: tf.GraphModel | null = null

let isClick = false;
const predictText = document.getElementById('predictTxt') as HTMLDivElement;
async function init(){
  model = await tf.loadGraphModel('models/model.json');
  predictText.innerText = 'Predict:';
}

function clear(){
  lineHeightMin = 2000;
  lineHeightMax = 0;
  lineWidthMin = 2000;
  lineWidthMax = 0;
}

async function predict(element: HTMLImageElement) {
  // const element2 = document.getElementById('textImage') as HTMLImageElement;
  const height = 96
  const width = 2000
  const ratio = element.width / element.height;

  const tw = Math.floor(height * ratio);
  const img = tf.browser.fromPixels(element)
    .resizeBilinear([height, tw])
    .mean(2)
    .toFloat()
    .expandDims(0)
    .expandDims(-1);
  
  const h = img.shape[1] as number;
  const w = img.shape[2] as number;
  const input = img.pad([[0, 0], [0, height - h], [0, width - w], [0, 0]], 255);

  const result = tf.tidy((): string => {    
    if (model){
      const pred = model.predict(input) as tf.Tensor<tf.Rank>;
      const debug = pred.arraySync() as number[][];
      return degbugTxt(debug);
      
      // const predIndex = pred.argMax(1);
      // const data = predIndex.dataSync() as Int32Array;

      // for (let i = 0; i < data.length; i += 1) {
      //   if (data[i] !== 0 && !(i > 0 && data[i - 1] === data[i])) {
      //     text.push(characters[data[i]]);
      //   }
      // }
    }
    return ""
  });
  return result;
}

function debugImg(img: HTMLImageElement){
  const imgElement = document.getElementById('debugImg') as HTMLDivElement;
  while(imgElement.lastChild){
    imgElement.removeChild(imgElement.lastChild);
  }
  img.height = 48;
  imgElement.appendChild(img);
}

function degbugTxt(debug: number[][]): string {
  const textElement = document.getElementById('debugTxt') as HTMLDivElement;
  while(textElement.lastChild){
    textElement.removeChild(textElement.lastChild);
  }
  const items = debug.map(d => {
    return d.map((acc, idx) => ({key: idx, value: acc}))
      .filter( item => (item.value > d[0]) )
      .sort(function (a, b) {
        return b.value - a.value;
      });
  });
  
  let tmp = 0;
  const text = items.map(d => {
    if (d.length == 0){
      tmp = 0
      return null;
    }
    if (tmp === d[0].key){
      return null;
    }
    tmp = d[0].key;
    const texts = d.slice(0,3).map((item) =>{
      const idx = item.key;
      const acc = item.value;
      return characters[idx] + " " + String(acc)
    });
    const div = document.createElement("div");
    div.innerHTML = "<hr/>" + texts.join("<br />");
    textElement.appendChild(div);
    return characters[d[0].key];
  })
  return text.join("")
}

function checkPos(x: number, y: number){
  if (lineHeightMin > y){
    lineHeightMin = y;
  }
  if (lineHeightMax < y){
    lineHeightMax = y;
  }
  if (lineWidthMin > x){
    lineWidthMin = x;
  }
  if (lineWidthMax < x){
    lineWidthMax = x;
  }
}

function view() {
  const width = window.innerWidth;
  const height = 190;
  
  const canvasStage = new Konva.Stage({
    container: 'canvas',
    x: 0,
    y: 0,
    width: width,
    height: height,
  });

  const canvasLayer = new Konva.Layer();
  canvasStage.add(canvasLayer);

  const canvasRect =  new Konva.Rect({ 
    x: 0,
    y: 2,
    width: width,
    height: height - 4,
    listening: true,
    fill: "#eee",
    stroke: "black"
  })

  canvasLayer.add(canvasRect);
  canvasStage.draw()

  let isPaint = false;
  const mode = 'brush';
  let lastLine: Konva.Line | null = null;

  canvasStage.on('mousedown touchstart', () => {
    isPaint = true;
    const pos = canvasStage.getPointerPosition();
    if (pos === null) {
      return;
    }
    lastLine = new Konva.Line({
      stroke: 'black',
      strokeWidth: 5,
      lineCap: "round",
      lineJoin: "round",
      bezier: true,
      globalCompositeOperation:
        mode === 'brush' ? 'source-over' : 'destination-out',
      points: [pos.x, pos.y],
    });
    checkPos(pos.x, pos.y)
    canvasLayer.add(lastLine);
  });

  canvasStage.on('mouseup touchend', () => {
    isPaint = false;
  });

  canvasStage.on('mousemove touchmove', () => {
    if (!isPaint) {
      return;
    }
    const pos = canvasStage.getPointerPosition();
    if (pos === null) {
      return;
    }
    if (lastLine !== null) {
      const newPoints = lastLine.points().concat([pos.x, pos.y]);
      lastLine.points(newPoints);
      checkPos(pos.x, pos.y)
      canvasLayer.batchDraw();
    }
  });
  
  const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
  clearBtn.onclick = () =>{
    canvasLayer.find('Line').each(line => {
      line.remove();
    })
    predictText.innerText = 'Predict:';
    clear();
    canvasLayer.batchDraw();
  };

  const predictBtn = document.getElementById('predictBtn') as HTMLButtonElement;
  predictBtn.onclick = () => {
    if (isClick){
      return
    }
    isClick = true;

    let yMin = lineHeightMin -4;
    let yMax = lineHeightMax +4;
    let xMin = lineWidthMin -4;
    let xMax = lineWidthMax + 4;

    if (lineHeightMin == 0 || lineWidthMax == 0){
      isClick = false;
      return
    }
    predictText.innerText = 'Predict: 予測中';

    canvasRect.strokeEnabled(false)
    canvasRect.fill("white")
    canvasLayer.toImage({
      x: xMin,
      y: yMin,
      width: xMax - xMin,
      height: yMax - yMin,
      quality: 100,
      pixelRatio: canvasLayer.getCanvas().pixelRatio,
      callback(img) {
        // debug
        canvasRect.strokeEnabled(true)
        canvasRect.fill("#eee")
        predict(img).then(text => {
          debugImg(img)
          predictText.innerText = 'Predict: ' + text
          isClick = false;
        })
      }
    })
  };
}
init()
clear();
view();

