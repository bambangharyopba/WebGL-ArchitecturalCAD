var vertexId = 0;
var edgeId = 0;
var faceId = 0;
var polygonId = 0;

function isInLine(x, y, v1, v2){
    let found = false;
    let tx = v1.getX();
    let ty = v1.getY();
    let len = v1.distance(v2);
    let dx = (v2.getX() - v1.getX()) / len;
    let dy = (v2.getY() - v1.getY()) / len
    let epsilon = 2;
    while(((dx > 0 && tx <= v2.getX() || dx < 0 && tx >= v2.getX()) || (dy > 0 && ty <= v2.getY() || dy < 0 && ty >= v2.getY())) && !found){
        if(x > tx - epsilon && x < tx + epsilon && y > ty - epsilon && y < ty + epsilon){
            found = true;
        }
        else{
            tx += dx;
            ty += dy;
        }
    }
    return found;
}


class Vertex {
    constructor(x, y){
        this.id = vertexId;
        this.x = x;
        this.y = y;
        vertexId++;
    }
    getId(){return this.id}
    getX(){return this.x}
    getY(){return this.y}
    getCoordinate(){return [this.x, this.y]}
    setX(x){this.x = x}
    setY(y){this.y = y}
    setCoordinate(x, y){
       this.x = x;
       this.y = y;
    }
    add(vertex){
        this.x += vertex.getX();
        this.y += vertex.getY(); 
    }
    subtract(vertex){
        this.x -= vertex.getX();
        this.y -= vertex.getY();
    }
    distance(vertex){
        return Math.sqrt(Math.pow(vertex.getX() - this.x, 2) + Math.pow(vertex.getY() - this.y, 2));
    }
    translate(distance_x, distance_y){
        this.x += distance_x;
        this.y += distance_y;
    }
    rotate(deg){
        this.x = this.x * Math.cos(deg) - this.y * Math.sin(deg);
        this.y = this.y * Math.sin(deg) + this.y * Math.cos(deg);
    }
    scale(scale){
        this.x = this.x * scale;
        this.y = this.y * scale;
    }
    isInCoordinate(x, y){
        var epsilon = 5;
        return (x > this.x - epsilon && x < this.x + epsilon && y > this.y - epsilon && y < this.y + epsilon);
    }
    render(gl){
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([this.x, this.y]), gl.STATIC_DRAW);
        gl.drawArrays(gl.POINTS, 0, 1);
    }
 }

class Edge {
    constructor(v1, v2){
       this.id = edgeId;
       this.v1 = v1;
       this.v2 = v2;
       edgeId++;
    }
    getId(){return this.id}
    getV1(){return this.v1}
    getV2(){return this.v2}
    setVertex(v1, v2){
       this.v1 = v1;
       this.v2 = v2;
    }
    translate(distance_x, distance_y){
        this.v1.translate(distance_x,distance_y);
        this.v2.translate(distance_x,distance_y);
    }
    rotate(deg){
        this.v1.rotate(deg);
        this.v2.rotate(deg);
    }
    scale(scale){
        this.v1.scale(scale);
        this.v2.scale(scale);
    }
    getCoordinate(){
        return this.v1.getCoordinate().concat(this.v2.getCoordinate());
    }
    isInCoordinate(x, y){
        return isInLine(x, y, this.v1, this.v2);
    }
    render(gl, colorLocation){
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.v1.getCoordinate().concat(this.v2.getCoordinate())), gl.STATIC_DRAW);
        gl.uniform4f(colorLocation, 0, 0, 0, 1);
        gl.drawArrays(gl.LINES, 0, 2);
    }
    renderVertices(gl){
        this.v1.render(gl);
        this.v2.render(gl);
    }
}

class Polygon{
    constructor(vertices, type = 0){
        this.vertices = vertices;
        this.id = polygonId;
        polygonId += 1;
        this.type = type; // 0 polygon, 1 square
        this.red = 0;
        this.green = 0;
        this.blue = 0;
    }

    getColor() {
        return [this.red, this.green, this.blue];
    }

    setColor(r, g, b) {
        this.red = r;
        this.green = g;
        this.blue = b;
    }
    getType() {return this.type}
    getId(){return this.id}
    getVertices(){return this.vertices}
    getCoordinate(){
        let coordinate = []
        this.vertices.forEach(vertice =>{
            coordinate = coordinate.concat(vertice.getCoordinate());
        });
        return coordinate;
    }
    isInCoordinate(x, y){
        let found = false;
        for(let i = 0; i < this.vertices.length; i++){
            if(isInLine(x, y, this.vertices[i], this.vertices[(i+1) >= this.vertices.length ? 0 : i+1])){
                found = true;
            }
        }
        return found
    }
    render(gl, colorLocation){
        var triangleData = [];
        for(var i = 1; i < this.vertices.length-1; i ++){
            triangleData.push(this.vertices[0].getX());
            triangleData.push(this.vertices[0].getY());
            triangleData.push(this.vertices[i].getX());
            triangleData.push(this.vertices[i].getY());
            triangleData.push(this.vertices[i + 1].getX());
            triangleData.push(this.vertices[i + 1].getY());
        }
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleData), gl.STATIC_DRAW);
        gl.uniform4f(colorLocation, this.red, this.green, this.blue, 1);
        
        gl.drawArrays(gl.TRIANGLES, 0, triangleData.length);
    }
    renderVertices(gl){
        this.vertices.forEach(vertex =>{
            vertex.render(gl);
        })
    }

}
 
class Square extends Polygon{
    constructor(_vertices){
        super(_vertices, 1);
    }
    scale(scale){
        this.vertices.forEach(vertex =>{
            vertex.scale(scale);
        })
    }

}
