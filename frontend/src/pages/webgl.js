
// import * as webglUtils from 'webgl-utils.js';


export function initVertexBuffers(gl) {
    var dim = 2; 
    var vertices = new Float32Array([
        -1, 1, 1, 1, 1, -1,
        -1, 1, 1, -1, -1, -1
    ]);

    // Background (fragment) color
    var rgba = [0.5294117647058824, 0.7137254901960784, 0.7607843137254902, 1];

    var vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
        console.log('Failed to create the buffer object');
        return -1;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return -1;
    }
    gl.vertexAttribPointer(a_Position, dim, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);
    var u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    if (u_FragColor < 0) {
        console.log('Failed to get the storage location of u_FragColor');
        return -1;
    }
    gl.uniform4fv(u_FragColor, rgba);

    return vertices.length / dim;
}

export function initShaders(gl, fs_source) {
    var vertCode =
      'attribute vec4 a_Position;' +
      'void main(void) {' +
        ' gl_Position = a_Position;' +
      '}';
    var fragCode =
      'precision mediump float;' +
      'uniform vec4 u_FragColor;' +
      'void main() {' +
        ' gl_FragColor = u_FragColor;' +
      '}';
      
    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    var glProgram = gl.createProgram();
    gl.shaderSource(vertexShader, vertCode);
    gl.compileShader(vertexShader);      
    gl.shaderSource(fragmentShader, fragCode); 
    gl.compileShader(fragmentShader);
    gl.attachShader(glProgram, vertexShader);
    gl.attachShader(glProgram, fragmentShader);
    gl.linkProgram(glProgram);
    if (!gl.getProgramParameter(glProgram, gl.LINK_STATUS)) {
        alert("Unable to initialize the shader program");
        return false;
    }
    gl.useProgram(glProgram);
    gl.program = glProgram;

    return true;
}

export function makeShader(gl, src, type) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert("Error compiling shader: " + gl.getShaderInfoLog(shader));
        return;
    }
    return shader;
}

export function renderImage(gl, image) {

    var vertCode =
    'attribute vec2 a_position;' +
    'attribute vec2 a_texCoord;' +
    'uniform vec2 u_resolution;' +
    'varying vec2 v_texCoord;' +
    'void main() {' +
    '   vec2 zeroToOne = a_position / u_resolution;' +
    '   vec2 zeroToTwo = zeroToOne * 2.0;' +
    '   vec2 clipSpace = zeroToTwo - 1.0;' +
    '   gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);' +
    '   v_texCoord = a_texCoord;' +
    '}';
    var fragCode =
    'precision mediump float;' +
    'uniform sampler2D u_image;' +
    'varying vec2 v_texCoord;' +
    'void main() {' +
    '   gl_FragColor = texture2D(u_image, v_texCoord);' +
    '}';

    var vertexShader = gl.createShader(gl.VERTEX_SHADER);
    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    var program = gl.createProgram();
    gl.shaderSource(vertexShader, vertCode);
    gl.compileShader(vertexShader);      
    gl.shaderSource(fragmentShader, fragCode); 
    gl.compileShader(fragmentShader);
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    alert("Unable to initialize the shader program");
    return false;
    }
    gl.useProgram(program);
    gl.program = program;

    var positionLocation = gl.getAttribLocation(program, "a_position");
    var texcoordLocation = gl.getAttribLocation(program, "a_texCoord");
    var positionBuffer = gl.createBuffer();
    var texcoordBuffer = gl.createBuffer();
    var texture = gl.createTexture();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    setRectangle(gl, 0, 0, image.width, image.height);
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        0.0,  0.0,
        1.0,  0.0,
        0.0,  1.0,
        0.0,  1.0,
        1.0,  0.0,
        1.0,  1.0,
    ]), gl.STATIC_DRAW);
    gl.bindTexture(gl.TEXTURE_2D, texture);    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    var resolutionLocation = gl.getUniformLocation(program, "u_resolution");    
    // webglUtils.resizeCanvasToDisplaySize(gl.canvas);   
    var devicePixelRatio = window.devicePixelRatio || 1;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);    
    // gl.clearColor(0, 0, 0, 0);
    // gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);    
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    var size = 2;          // 2 components per iteration
    var type = gl.FLOAT;   // the data is 32bit floats
    var normalize = false; // don't normalize the data
    var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    var offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        positionLocation, size, type, normalize, stride, offset);
    gl.enableVertexAttribArray(texcoordLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    size = 2;          // 2 components per iteration
    type = gl.FLOAT;   // the data is 32bit floats
    normalize = false; // don't normalize the data
    stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        texcoordLocation, size, type, normalize, stride, offset);
    gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);
    var primitiveType = gl.TRIANGLES;
    offset = 0;
    var count = 6;

    gl.viewport(gl.canvas.width - (image.width + (20 * devicePixelRatio)), - (gl.canvas.height - (image.height + (devicePixelRatio * 20))), gl.canvas.width, gl.canvas.height);
    gl.enable( gl.BLEND );
    gl.blendEquation( gl.FUNC_ADD );
    gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );

    gl.drawArrays(primitiveType, offset, count);
}

export function setRectangle(gl, x, y, width, height) {
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
