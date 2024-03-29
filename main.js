document.addEventListener('DOMContentLoaded', main);

var gl, shader, colorLocation;

const tools = {1: "SELECT", 2: "DRAW LINE", 3: "DRAW SQUARE", 4: "DRAW POLYGON"}

var state = {"tools": tools[2]};
var vertices = [];
var edges = [];
var polygons = [];
var mode = 1;
var temporalVertex = [];
var temporalEdge = [];
var mousePos;

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

  colorLocation = gl.getUniformLocation(program, "u_color");

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

  gl.uniform4f(colorLocation, 0, 0, 0, 1);

  initInput();
  render();
}

function render() {
  // Render all edges for all objects
  temporalEdge = [];
  edges.forEach((edge) => { // render edges
    edge.render(gl, colorLocation);
    if(edge.getId() == state["id"] && state["selected"] == "line"){ // render selected vertices
      edge.renderVertices(gl);
    }
  })
  
  let before;
  let count = 0;
  for (let key in temporalVertex) {
    vertex = temporalVertex[key];
    vertex.render(gl);
    if (count != 0) {
      temporalEdge.push(new Edge(before, vertex))
    }
    count += 1;
    before = vertex;
  }

  temporalEdge.forEach((edge) => {
    edge.render(gl);
  })

  polygons.forEach((polygon) => { // render polygons
    polygon.render(gl, colorLocation);
    if(polygon.getId() == state["id"] && (state["selected"] == "square" || state["selected"] == "polygon")){ // render selected vertices
      polygon.renderVertices(gl);
    }
  })
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

function initInput(){
  const fileSelector = document.getElementById('load');
  
  
  fileSelector.addEventListener("change", (ev) => {
    const file = ev.target.files;
    if(file.length > 0){
      (async () => {
        var thenedPromise = file[0].text().then(text => {
          edges = [];
          polygons = [];
          let token = text.split("\n");
          token = token.slice(0,token.length - 1);
          let load_mode = 0;
          let vert = [];
          let rgb = [];
          for(let i = 0; i < token.length; i++){
            if(token[i] == "Edge"){
              load_mode = 0;
            } else if(token[i] == "Square"){
              load_mode = 1;
            } else if(token[i] == "Polygon"){
              load_mode = 2;
            } else if(token[i] == "}"){
              if(load_mode == 0){
                edges.push(new Edge(vert[0], vert[1]));
              } else if(load_mode == 1){
                var square = new Square(vert);
                square.setColor(rgb[0], rgb[1], rgb[2]);
                polygons.push(square);
              } else if(load_mode == 2){
                var polygon = new Polygon(vert);
                polygon.setColor(rgb[0], rgb[1], rgb[2]);
                polygons.push(polygon);
              }
              vert = [];
              rgb = [];
            } else if(token[i] != "{"){
              let value = token[i].split(",");
              if (value.length === 3) {
                rgb.push(parseFloat(value[0]));
                rgb.push(parseFloat(value[1]));
                rgb.push(parseFloat(value[2]));
              } else {
                let coor = token[i].split(",");
                var tex = new Vertex(parseInt(coor[0]), parseInt(coor[1]));
                vert.push(tex);
              }
            }
          }
        });

        await thenedPromise;

        render();
      })();
    }
  });

  // TODO: Tools
  document.getElementById("select-btn").addEventListener("click", function() {
    temporalVertex =[];
    state = {};
    state["tools"] = tools[1];
    document.getElementById("select-btn").disabled = true;
    document.getElementById("line-btn").disabled = false;
    document.getElementById("square-btn").disabled = false;
    document.getElementById("poly-btn").disabled = false; 
    document.getElementById("status").innerHTML = "Status: Select & Edit";
  });
  document.getElementById("line-btn").addEventListener("click", function() {
    temporalVertex =[];
    state = {};
    state["tools"] = tools[2];
    document.getElementById("select-btn").disabled = false;
    document.getElementById("line-btn").disabled = true;
    document.getElementById("square-btn").disabled = false;
    document.getElementById("poly-btn").disabled = false; 
    document.getElementById("status").innerHTML = "Status: Drawing Line";
  });
  document.getElementById("square-btn").addEventListener("click", function() {
    temporalVertex =[];
    state = {};
    state["tools"] = tools[3];
    document.getElementById("select-btn").disabled = false;
    document.getElementById("line-btn").disabled = false;
    document.getElementById("square-btn").disabled = true;
    document.getElementById("poly-btn").disabled = false; 
    document.getElementById("status").innerHTML = "Status: Drawing Square";
  });
  document.getElementById("poly-btn").addEventListener("click", function() {
    temporalVertex =[];
    state = {};
    state["tools"] = tools[4];
    document.getElementById("select-btn").disabled = false;
    document.getElementById("line-btn").disabled = false;
    document.getElementById("square-btn").disabled = false;
    document.getElementById("poly-btn").disabled = true; 
    document.getElementById("status").innerHTML = "Status: Drawing Polygon";
  });

  gl.canvas.addEventListener("click", ev =>{
    if(!state.hasOwnProperty("draw")){ // idle state
      if(state["tools"] == tools[1]) {
        document.getElementById("select-btn").disabled = true;
        document.getElementById("line-btn").disabled = false;
        document.getElementById("square-btn").disabled = false;
        document.getElementById("poly-btn").disabled = false; 
        document.getElementById("status").innerHTML = "Status: Select & Edit";
        let found = false;
        for(let i = 0; i < edges.length; i++){ // search coordinate in edges
          if(found) break;
          if(edges[i].isInCoordinate(mousePos.x, mousePos.y)){
            state["selected"] = "line";
            state["id"] = edges[i].getId();
            found = true;
          }
        }
        for(let i = 0; i < polygons.length; i++){ // search coordinate in polygons
          if(polygons[i].isInCoordinate(mousePos.x, mousePos.y)){
            if(found) break;
            if (polygons[i].getType() === 1) {
              state["selected"] = "square";
              found = true;
            } else {
              state["selected"] = "polygon";
              found = true;
            }
            state["id"] = polygons[i].getId();
          }
        }
        
        render();
      } else if(state["tools"] == tools[2]){ // start line drawing state
        state["tempvertex"] = [mousePos.x, mousePos.y];
        state["draw"] = "line";
      } else if(state["tools"] == tools[3]){ // start square drawing state
        state["tempvertex"] = [mousePos.x, mousePos.y];
        state["draw"] = "square";
      } else if(state["tools"] == tools[4]) { // start polygon drawing state
        temporalVertex = [new Vertex(mousePos.x, mousePos.y)];
        state["tempvertex"] = [mousePos.x, mousePos.y];
        state["draw"] = "polygon";

        state["start"] = [mousePos.x, mousePos.y];
        render();
      }
    } else if(state.hasOwnProperty("draw")){ // drawing state
      if(state["draw"] == "line"){
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
        delete state["draw"];
        render();
      } else if(state["draw"] == "square"){
        let x = state["tempvertex"][0];
        let y = state["tempvertex"][1];
        let dx = mousePos.x - x;
        let dy = mousePos.y - y;
        let d =  (Math.abs(mousePos.y - y) > Math.abs(mousePos.x - x)) ? Math.abs(mousePos.y - y) : Math.abs(mousePos.x - x); 
        if(d != 0){
          let vertices = [];
          if(dx < 0 && dy < 0){
            vertices = [new Vertex(x,y), new Vertex(x, y - d), new Vertex(x - d, y - d), new Vertex(x - d, y)];
          } else if(dx < 0 && dy > 0){
            vertices = [new Vertex(x,y), new Vertex(x, y + d), new Vertex(x - d, y + d), new Vertex(x - d, y)];
          } else if(dx > 0 && dy < 0){
            vertices = [new Vertex(x,y), new Vertex(x, y - d), new Vertex(x + d, y - d), new Vertex(x + d, y)];
          } else {
            vertices = [new Vertex(x,y), new Vertex(x, y + d), new Vertex(x + d, y + d), new Vertex(x + d, y)];
          }
          let square = new Square(vertices);
          polygons.push(square);
          state["tools"] = tools[1];
          state["selected"] = "square";
          state["id"] = square.getId();
        }
        delete state["tempvertex"];
        delete state["draw"];
        render();
      } else if(state["draw"] == "polygon"){
        if ((Math.abs(state["start"][0] - mousePos.x) < 5) && Math.abs((state["start"][1] - mousePos.y) < 5)) { // done drawing
          if (temporalVertex.length >= 3) { 
            let poly = new Polygon(temporalVertex);
            polygons.push(poly);
            state["tools"] = tools[1];
            
          }
          temporalVertex = [];
          delete state["start"];
          delete state["draw"];
          delete state["tempvertex"];
        } else {
          temporalVertex.push(new Vertex(mousePos.x, mousePos.y));
          state["tempvertex"] = [mousePos.x, mousePos.y];
        }
        render();
      }
    }
  })

  gl.canvas.addEventListener("mousedown", ev => {
    // clicking on vertex event
    if(state["tools"] == tools[1] && state["selected"] == "line" && state.hasOwnProperty("id")){ // line selected
      let idx = -1;
      for(let i = 0; i < edges.length; i++){ // search edge with id == state[id]
        if(edges[i].getId() == state["id"]){
          idx = i;
          break;
        }
      }
      if(idx != -1){ // if edge found
        if(edges[idx].getV1().isInCoordinate(mousePos.x, mousePos.y)){ // if mouse on vertex 1 of edge
          state["dragvertex"] = true;
          state["vertex"] = "v1"; 
        }
        else if(edges[idx].getV2().isInCoordinate(mousePos.x, mousePos.y)){ // if mouse on vertex 2 of edge
          state["dragvertex"] = true;
          state["vertex"] = "v2"; 
        }
      }
      render();
    }
    else if(state["tools"] == tools[1] && (state["selected"] == "square" || state["selected"] == "polygon") && state.hasOwnProperty("id")){ // polygon selected
      let idx = -1;
      for(let i = 0; i < polygons.length; i++){ // search polygon with id == state[id]
        if(polygons[i].getId() == state["id"]){ 
          idx = i;
          break;
        }
      }
      if(idx != -1){ // if polygon found
        let vert = polygons[idx].getVertices();
        let vidx = -1;
        for(let j = 0; j < vert.length; j++){ // search clicked vertex
          if(vert[j].isInCoordinate(mousePos.x, mousePos.y)){ 
            vidx = j;
            break;
          }
        }
        if(vidx != -1){ // if vertex found
          state["dragvertex"] = true;
          state["vertex"] = vidx;
        }
      }
      render();
    }
  })

  gl.canvas.addEventListener("mousemove", ev => {

    let rect = gl.canvas.getBoundingClientRect();
    mousePos = {x: ev.clientX - rect.left,
                  y: ev.clientY - rect.top}

    if(state.hasOwnProperty("draw")){ // drawing state
      if(state["draw"] == "line"){
        let line = state["tempvertex"].concat([mousePos.x, mousePos.y]) 
        renderLine(line);
        render();
      }
      else if(state["draw"] == "square"){
        let x = state["tempvertex"][0];
        let y = state["tempvertex"][1];
        let dx = mousePos.x - x;
        let dy = mousePos.y - y;
        let d =  (Math.abs(mousePos.y - y) > Math.abs(mousePos.x - x)) ? Math.abs(mousePos.y - y) : Math.abs(mousePos.x - x); 
        let line = state["tempvertex"];
        if(dx < 0 && dy < 0){
          line = line.concat([x, y - d, x - d, y - d, x - d, y]) 
        } else if(dx < 0 && dy > 0){
          line = line.concat([x, y + d, x - d, y + d, x - d, y]) 
        } else if(dx > 0 && dy < 0){
          line = line.concat([x, y - d, x + d, y - d, x + d, y]) 
        } else {
          line = line.concat([x, y + d, x + d, y + d, x + d, y]) 
        }
        renderLineLoop(line);
        render();
      }
      else if(state["draw"] == "polygon"){
        let line = state["tempvertex"].concat([mousePos.x, mousePos.y]) 
        renderLine(line);
        render();
      }
    }
    else if(state.hasOwnProperty("dragvertex")){ // dragging vertex
      if(state["selected"] == "line"){
        let idx = -1;
        for(let i = 0; i < edges.length; i++){ // searching edge in edges with id == state[id]
          if(edges[i].getId() == state["id"]){
            idx = i;
            break;
          }
        }
        if(idx != -1){ // if edge found
          if(state["vertex"] == "v1"){
            edges[idx].getV1().setCoordinate(mousePos.x, mousePos.y);

            // snapping two vertex feature 
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
            edges[idx].getV2().setCoordinate(mousePos.x, mousePos.y);

            // snapping two vertex feature
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
      else if(state["selected"] == "square" || state["selected"] == "polygon"){
        let idx = -1;
        for(let i = 0; i < polygons.length; i++){ // search polygon with id = state[id]
          if(polygons[i].getId() == state["id"]){
            idx = i;
            break;
          }
        }
        if(idx != -1){ // if polygon found
          if(state["selected"] == "square"){
            let vert = polygons[idx].getVertices();
            let prevVidx = (state["vertex"] > 0) ? state["vertex"] - 1 : vert.length - 1;
            let nextVidx = (state["vertex"] < vert.length - 1) ? state["vertex"] + 1 : 0;          
            let crossVidx = (state["vertex"] > 1) ? state["vertex"] - 2 : state["vertex"] + 2;
            let crossX = vert[crossVidx].getCoordinate()[0];
            let crossY = vert[crossVidx].getCoordinate()[1];
            let dx = mousePos.x - crossX;
            let dy = mousePos.y - crossY;
            let d = (Math.abs(dy) > Math.abs(dx)) ? Math.abs(dx) : Math.abs(dy);
            if(dx < 0 && dy < 0){
              vert[state["vertex"]].setCoordinate(crossX - d, crossY - d );
              vert[prevVidx].setCoordinate(crossX, crossY - d);
              vert[nextVidx].setCoordinate(crossX - d, crossY);
            } else if(dx < 0 && dy > 0){
              vert[state["vertex"]].setCoordinate(crossX - d, crossY + d);
              vert[prevVidx].setCoordinate(crossX - d, crossY);
              vert[nextVidx].setCoordinate(crossX, crossY + d);
            } else if(dx > 0 && dy < 0){
              vert[state["vertex"]].setCoordinate(crossX + d, crossY - d);
              vert[prevVidx].setCoordinate(crossX + d, crossY);
              vert[nextVidx].setCoordinate(crossX, crossY - d);
            } else {
              vert[state["vertex"]].setCoordinate(crossX + d, crossY + d);
              vert[prevVidx].setCoordinate(crossX, crossY + d);
              vert[nextVidx].setCoordinate(crossX + d, crossY);
            }
          } else if(state["selected"] == "polygon"){
            let vert = polygons[idx].getVertices();
            vert[state["vertex"]].setCoordinate(mousePos.x, mousePos.y);
          }
        }
        render();
      }
    }
  })

  gl.canvas.addEventListener("mouseup", ev => {
    if(state["tools"] == tools[1] && state["selected"] == "line" && state["dragvertex"]){
      delete state["dragvertex"];
      delete state["vertex"];
      render();
    }
    else if(state["tools"] == tools[1] && (state["selected"] == "square" || state["selected"] == "polygon") && state["dragvertex"]){
      delete state["dragvertex"];
      delete state["vertex"];
      render();
    }
  })
}

function save(){
  let data = "";
  if(edges.length > 0){
    data = "Edge\n";
    edges.forEach((edge) =>{
      let coordinate = edge.getCoordinate();
      data += "{\n";
      for(let i = 0; i < coordinate.length; i += 2){
        data += coordinate[i].toString() + "," + coordinate[i+1].toString() + "\n";
      }
      data += "}\n";
    })
  }
  if(polygons.length > 0){
    data += "Square\n";
    polygons.forEach((polygon) =>{
      if(polygon.getType() == 1){
        let coordinate = polygon.getCoordinate();
        data += "{\n";
        for(let i = 0; i < coordinate.length; i += 2){
          data += coordinate[i].toString() + "," + coordinate[i+1].toString() + "\n";
        }
        let colors = polygon.getColor(); 
        data += colors[0].toString() + "," + colors[1].toString() + "," + colors[2].toString() + "\n";
        data += "}\n";
      }
    })
    data += "Polygon\n";
    polygons.forEach((polygon) =>{
      if(polygon.getType() == 0){
        let coordinate = polygon.getCoordinate();
        data += "{\n";
        for(let i = 0; i < coordinate.length; i += 2){
          data += coordinate[i].toString() + "," + coordinate[i+1].toString() + "\n";
        }
        let colors = polygon.getColor(); 
        data += colors[0].toString() + "," + colors[1].toString() + "," + colors[2].toString() + "\n";
        data += "}\n";
      }
    })
  }

  download(data, "webgl-snapshot.txt", "text");
}

function changeColor() {
  var colorValue = document.getElementById('colorValue').value;
  if(state["selected"] == "square" || state["selected"] == "polygon") {
    if (colorValue.length !== 6) {
      alert("Invalid Input");
    } else {
      var red = parseInt(red = colorValue[0] + colorValue[1], 16) / 255.0;
      var green = parseInt(colorValue[2] + colorValue[3], 16) / 255.0;
      var blue = parseInt(colorValue[4] + colorValue[5], 16) / 255.0;
      if ((red <= 1.0 && red >= 0.0) && (green <= 1.0 && green >= 0.0) && (blue <= 1.0 && blue >= 0.0)) {
        polygons[state["id"]].setColor(red, green, blue);
        render();
      } else {
        alert("Invalid Input");
      }
    }
  }
}

function download(data, filename, type) {
  var file = new Blob([data], {type: type});
  if (window.navigator.msSaveOrOpenBlob) // IE10+
      window.navigator.msSaveOrOpenBlob(file, filename);
  else { // Others
      var a = document.createElement("a"),
              url = URL.createObjectURL(file);
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function() {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);  
      }, 0); 
  }
}

function help(){
  var x = document.getElementById("help");
  if (x.style.display === "none") {
    x.style.display = "block";
  } else {
    x.style.display = "none";
  }
}

function helpItem(number){
  var x = document.getElementsByClassName("help-item");
  for(let i = 0; i < x.length; i++){
    if(i == number){
      x.item(i).style.display = "block";
    } else {
      x.item(i).style.display = "none";
    }
  }
}