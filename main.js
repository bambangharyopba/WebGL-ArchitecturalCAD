document.addEventListener('DOMContentLoaded', main);

var gl, shader;

const tools = {1: "SELECT", 2: "DRAW LINE", 3: "DRAW SQUARE", 4: "DRAW POLYGON"}

var state = {"tools": tools[2]};
var vertices = [];
var edges = [];
var faces = [];
var polygons = [];
var mode = 1;
var temporalVertex = [];

function initGL() {
  let canvas = document.querySelector('#webgl');
  gl = canvas.getContext('webgl2');
  if (!gl) {
    alert('Unable to initialize WebGL2. Your browser or machine may not support it.');
    return;
  }
  gl.clearColor(0.0, 0.0, 0.0, 0.0, 0.0)
}

function main(){
  initGL();
  
  gl.canvas.width = window.innerWidth;
  gl.canvas.height = window.innerHeight;

  var vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  var fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

  var program = createProgram(gl, vertexShader, fragmentShader);

  var positionAttributeLocation = gl.getAttribLocation(program, "a_position");

  var resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution")

  var colorLocation = gl.getUniformLocation(program, "u_color");

  var positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  var vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.enableVertexAttribArray(positionAttributeLocation);

  var size = 2;
  var type = gl.FLOAT;
  var normalized = false;
  var stride = 0;
  var offset = 0;
  gl.vertexAttribPointer(
    positionAttributeLocation, size, type, normalized, stride, offset);

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.useProgram(program);

  gl.bindVertexArray(vao);

  gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);

  gl.uniform4f(colorLocation, Math.random(), Math.random(),Math.random(), 1);

  initInput();
  render();
}

function render() {
  edges.forEach((edge) => {
    edge.render(gl);
    if(edge.getId() == state["id"] && state["selected"] == "line"){
      edge.renderVertices(gl);
    }
  })
  
  let before;
  let count = 0;
  for (let key in temporalVertex) {
    vertex = temporalVertex[key];
    vertex.render(gl);
    if (count != 0) {
      renderLine([[before.getX(), before.getY()], [vertex.getX(), vertex.getY()]]);
    }
    count += 1;
    before = vertex;
  }
  // let tempCoor = [];
  // temporalVertex.forEach((vertex) => {
  //   tempCoor.concat(vertex.getCoordinate());
  //   console.log("DIDALAM " + tempCoor);
  //   vertex.render(gl);
  // })
  // console.log("DSINI COK " + tempCoor);
  // renderLine(tempCoor);

  // temporalVertex.forEach((vertex) =>{
  // })
  polygons.forEach((polygon) => {
    polygon.render(gl);
    if(polygon.getId() == state["id"] && state["selected"] == "square"){
      polygon.renderVertices(gl);
    }
  })
  faces.forEach((face) => {
    face.render(gl);
    if(face.getId() == state["id"] && state["selected"] == "square"){
      face.renderVertices(gl);
    }
  })
  renderTools();
}

function renderLine(vertices){
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  var primitiveType = gl.LINES;
  var offset = 0;
  var count = vertices.length/2;
  gl.drawArrays(primitiveType, offset, count);
}

function renderVertex(vertices){
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  let primitiveType = gl.POINTS;
  let offset = 0;
  let count = vertices.length/2;
  gl.drawArrays(primitiveType, offset, count);
}

function renderLineLoop(vertices){
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  let primitiveType = gl.LINE_LOOP;
  let offset = 0;
  let count = vertices.length/2;
  gl.drawArrays(primitiveType, offset, count);
}

function renderTools(){
  vert = [0, 0, 50, 0, 50, 50, 0, 50];
  renderLineLoop(vert);
}

function isOnTools(x, y){
  return (x > 0 && x < 50 && y > 0 && y < 50)
}

function initInput(){
  gl.canvas.addEventListener("click", ev =>{
    let mousePos = input().getMousePos(gl.canvas, ev);
    if(isOnTools(mousePos.x, mousePos.y)){
      for(let i = 1; i < 5; i++){
        if(state["tools"] == tools[i]){
          if(i == 5 - 1){
            state = {};
            state["tools"] = tools[1];
          } else{
            state = {};
            state["tools"] = tools[i + 1];
          }
          break;
        }
      }
    } else if(state["drawpolygon"]){ // drawing state
      if ((Math.abs(state["start"][0] - mousePos.x) < 2 ) && Math.abs((state["start"][1] - mousePos.y) < 2)) { // done drawing
        if (temporalVertex.length >= 3) { 
          let poly = new Polygon(temporalVertex);
          polygons.push(poly);
          state["tools"] = tools[1];
        } else {
          temporalVertex = [];
        }
        delete state["start"];
        delete state["drawpolygon"];
        delete state["tempvertex"];
      } else {
        temporalVertex.push(new Vertex(mousePos.x, mousePos.y));
        state["tempvertex"] = [mousePos.x, mousePos.y];
      
      }
      render();
    }else if (state["tools"] == tools[4]) { // start drawing state
      temporalVertex = [new Vertex(mousePos.x, mousePos.y)];
      state["tempvertex"] = [mousePos.x, mousePos.y];
      state["drawpolygon"] = true;

      state["start"] = [mousePos.x, mousePos.y];
      render();
    }
    console.log(state);
    console.log(temporalVertex);
  })

  gl.canvas.addEventListener("mousedown", ev => {
    let mousePos = input().getMousePos(gl.canvas, ev);
    if(state["tools"] == tools[2]){
      state["tempvertex"] = [mousePos.x, mousePos.y];
      state["makeline"] = true;
    }
    else if(state["tools"] == tools[3]){
      state["tempvertex"] = [mousePos.x, mousePos.y];
      state["makesquare"] = true;
    }
    else if(state["tools"] == tools[1] && state['selected'] == "line" && state.hasOwnProperty("id")){
      let idx = -1;
      for(let i = 0; i < edges.length; i++){
        if(edges[i].getId() == state["id"]){
          idx = i;
          break;
        }
      }
      if(idx != -1){
        if(edges[idx].getV1().isInCoordinate(mousePos.x, mousePos.y)){
          state["dragvertex"] = true;
          state["vertex"] = "v1"; 
        }
        else if(edges[idx].getV2().isInCoordinate(mousePos.x, mousePos.y)){
          state["dragvertex"] = true;
          state["vertex"] = "v2"; 
        }
        else{
          let found = false;
          for(let i = 0; i < edges.length; i++){
            if(edges[i].isInCoordinate(mousePos.x, mousePos.y)){
              state["selected"] = "line";
              state["id"] = edges[i].getId();
              found = true;
              break;
            }
          }
          if(!found){
            delete state["selected"];
            delete state["id"];
          }
        }
        
      }
      render();
    }
    else if(state["tools"] == tools[1] && state['selected'] == "square" && state.hasOwnProperty("id")){
      let idx = -1;
      for(let i = 0; i < polygons.length; i++){
        if(polygons[i].getId() == state["id"]){
          idx = i;
          break;
        }
      }
      if(idx != -1){
        let vert = polygons[idx].getVertices();
        let vidx = -1;
        for(let j = 0; j < vert.length; j++){
          if(vert[j].isInCoordinate(mousePos.x, mousePos.y)){
            vidx = j;
            break;
          }
        }
        if(vidx != -1){
          state["dragvertex"] = true;
          state["vertex"] = vidx;
        }
        else{
          let found = false;
          for(let i = 0; i < polygons.length; i++){
            if(polygons[i].isInCoordinate(mousePos.x, mousePos.y)){
              state["selected"] = "square";
              state["id"] = polygons[i].getId();
              found = true;
              break;
            }
          }
          if(!found){
            delete state["selected"];
            delete state["id"];
          }
        }
      }
      render();
    }
    else if(state["tools"] == tools[1] && !isOnTools(mousePos.x, mousePos.y)){
      for(let i = 0; i < edges.length; i++){
        if(edges[i].isInCoordinate(mousePos.x, mousePos.y)){
          state["selected"] = "line";
          state["id"] = edges[i].getId();
        }
      }
      for(let i = 0; i < polygons.length; i++){
        if(polygons[i].isInCoordinate(mousePos.x, mousePos.y)){
          state["selected"] = "square";
          state["id"] = polygons[i].getId();
        }
      }
      for(let i = 0; i < faces.length; i++){
        if(faces[i].isInCoordinate(mousePos.x, mousePos.y)){
          state["selected"] = "square";
          state["id"] = faces[i].getId();
        }
      }
      render();
    }
    console.log(state);
  })

  gl.canvas.addEventListener("mousemove", ev => {
    let mousePos = input().getMousePos(gl.canvas, ev);
    if(state["tools"] == tools[2] && state["makeline"]){
      let line = state["tempvertex"].concat([mousePos.x, mousePos.y]) 
      renderLine(line);
      render();
    }
    else if(state["tools"] == tools[3] && state["makesquare"]){
      let x = state["tempvertex"][0];
      let y = state["tempvertex"][1];
      let d =  (Math.abs(mousePos.y - y) > Math.abs(mousePos.x - x)) ? mousePos.y - y : mousePos.x - x; 
      let line = state["tempvertex"].concat([x, y + d, x + d, y + d, x + d, y]) 
      console.log(line);
      renderLineLoop(line);
      render();
    }
    else if(state["tools"] == tools[4] && state["drawpolygon"]){
      let line = state["tempvertex"].concat([mousePos.x, mousePos.y]) 
      renderLine(line);
      render();
    }
    else if(state["tools"] == tools[1] && state["selected"] == "line" && state["dragvertex"]){
      let idx = -1;
      for(let i = 0; i < edges.length; i++){
        if(edges[i].getId() == state["id"]){
          idx = i;
          break;
        }
      }
      if(idx != -1){
        if(state["vertex"] == "v1"){
          edges[idx].getV1().setCoordinate(mousePos.x, mousePos.y);
          for(let j = 0; j < edges.length; j++){
            let v = edges[j].getV1();
            if(v.isInCoordinate(mousePos.x, mousePos.y)){
              edges[idx].getV1().setCoordinate(v.getCoordinate()[0], v.getCoordinate()[1]);
              break;
            }
            v = edges[j].getV2();
            if(v.isInCoordinate(mousePos.x, mousePos.y)){
              edges[idx].getV1().setCoordinate(v.getCoordinate()[0], v.getCoordinate()[1]);
              break;
            }
          }
        }
        else if(state["vertex"] == "v2"){
          console.log("v2");
          edges[idx].getV2().setCoordinate(mousePos.x, mousePos.y);
          for(let i = 0; i < edges.length; i++){
            let v = edges[i].getV1();
            if(v.isInCoordinate(mousePos.x, mousePos.y)){
              edges[idx].getV2().setCoordinate(v.getCoordinate()[0], v.getCoordinate()[1]);
              break;
            }
            v = edges[i].getV2();
            if(v.isInCoordinate(mousePos.x, mousePos.y)){
              edges[idx].getV2().setCoordinate(v.getCoordinate()[0], v.getCoordinate()[1]);
              break;
            }
          }
        }
      }
      render();
    }
    else if(state["tools"] == tools[1] && state["selected"] == "square" && state["dragvertex"]){
      let idx = -1;
      for(let i = 0; i < polygons.length; i++){
        if(polygons[i].getId() == state["id"]){
          idx = i;
          break;
        }
      }
      if(idx != -1){
        let vert = polygons[idx].getVertices();
        let prevVidx = (state["vertex"] > 0) ? state["vertex"] - 1 : vert.length - 1;
        let nextVidx = (state["vertex"] < vert.length - 1) ? state["vertex"] + 1 : 0; 
        vert[state["vertex"]].setCoordinate(mousePos.x, mousePos.y);
        if(state["vertex"] % 2 == 0){
          vert[prevVidx].setCoordinate(vert[prevVidx].getCoordinate()[0], mousePos.y);
          vert[nextVidx].setCoordinate(mousePos.x, vert[nextVidx].getCoordinate()[1]);
        } else {
          vert[nextVidx].setCoordinate(vert[nextVidx].getCoordinate()[0], mousePos.y);
          vert[prevVidx].setCoordinate(mousePos.x, vert[prevVidx].getCoordinate()[1]);
        }
      }
      render();
    }
  })

  gl.canvas.addEventListener("mouseup", ev => {
    if(state["tools"] == tools[2] && state["makeline"]){
      let mousePos = input().getMousePos(gl.canvas, ev);
      let x1 = state["tempvertex"][0];
      let y1 = state["tempvertex"][1];
      let x2 = mousePos.x;
      let y2 = mousePos.y;
      if(x1 != x2 && y1 != y2){
        let edge = new Edge(new Vertex(x1, y1), new Vertex(x2, y2));
        edges.push(edge);
        state["tools"] = tools[1];
        state["selected"] = "line";
        state["id"] = edge.getId();
      }
      delete state["tempvertex"];
      delete state["makeline"];
      render();
    }
    if(state["tools"] == tools[3] && state["makesquare"]){
      let mousePos = input().getMousePos(gl.canvas, ev);
      let x = state["tempvertex"][0];
      let y = state["tempvertex"][1];
      let d =  (Math.abs(mousePos.y - y) > Math.abs(mousePos.x - x)) ? mousePos.y - y : mousePos.x - x; 
      if(d != 0){
        let v = new Vertex(x, y);
        let square = new Square(v, d);
        polygons.push(square);
        state["tools"] = tools[1];
        state["selected"] = "square";
        state["id"] = square.getId();
      }
      delete state["tempvertex"];
      delete state["makesquare"];
      render();
    }
    else if(state["tools"] == tools[1] && state["selected"] == "line" && state["dragvertex"]){
      delete state["dragvertex"];
      delete state["vertex"];
      render();
    }
    else if(state["tools"] == tools[1] && state["selected"] == "square" && state["dragvertex"]){
      delete state["dragvertex"];
      delete state["vertex"];
      render();
    }
  })
}

function randomInt(range) {
  return Math.floor(Math.random() * range);
}

function setRectangle(gl, x, y, width, height) {
  var x1 = x;
  var x2 = x + width;
  var y1 = y;
  var y2 = y + height;
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
     x1, y1,
     x2, y1,
     x1, y2,
     x1, y2,
     x2, y1,
     x2, y2,
  ]), gl.STATIC_DRAW);
}
