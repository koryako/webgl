/*
** Copyright (c) 2016 The Khronos Group Inc.
**
** Permission is hereby granted, free of charge, to any person obtaining a
** copy of this software and/or associated documentation files (the
** "Materials"), to deal in the Materials without restriction, including
** without limitation the rights to use, copy, modify, merge, publish,
** distribute, sublicense, and/or sell copies of the Materials, and to
** permit persons to whom the Materials are furnished to do so, subject to
** the following conditions:
**
** The above copyright notice and this permission notice shall be included
** in all copies or substantial portions of the Materials.
**
** THE MATERIALS ARE PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
** EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
** MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
** IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
** CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
** TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
** MATERIALS OR THE USE OR OTHER DEALINGS IN THE MATERIALS.
*/

function generateTest(internalFormat, pixelFormat, pixelType, prologue, resourcePath) {
    var wtu = WebGLTestUtils;
    var tiu = TexImageUtils;
    var gl = null;
    var successfullyParsed = false;
    var redColor = [255, 0, 0];
    var greenColor = [0, 255, 0];
    var bitmaps = [];

    function init()
    {
        description('Verify texImage3D and texSubImage3D code paths taking ImageBitmap created from an HTMLVideoElement (' + internalFormat + '/' + pixelFormat + '/' + pixelType + ')');

        if(!window.createImageBitmap || !window.ImageBitmap) {
            finishTest();
            return;
        }

        gl = wtu.create3DContext("example");

        if (!prologue(gl)) {
            finishTest();
            return;
        }

        switch (gl[pixelFormat]) {
          case gl.RED:
          case gl.RED_INTEGER:
            greenColor = [0, 0, 0];
            break;
          default:
            break;
        }

        gl.clearColor(0,0,0,1);
        gl.clearDepth(1);

        video = document.createElement("video");
        video.oncanplaythrough = function() {
            var p1 = createImageBitmap(video, {imageOrientation: "none"}).then(function(imageBitmap) { bitmaps.noFlipY = imageBitmap });
            var p2 = createImageBitmap(video, {imageOrientation: "flipY"}).then(function(imageBitmap) { bitmaps.flipY = imageBitmap });
            Promise.all([p1, p2]).then(function() {
                runTest();
            }, function() {
                // createImageBitmap with options could be rejected if it is not supported
                finishTest();
                return;
            });
        }
        video.src = resourcePath + "red-green.theora.ogv";
        document.body.appendChild(video);
    }

    function runOneIteration(bindingTarget, program, bitmap, flipY)
    {
        debug('Testing ' + ', bindingTarget=' + (bindingTarget == gl.TEXTURE_3D ? 'TEXTURE_3D' : 'TEXTURE_2D_ARRAY'));
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // Enable writes to the RGBA channels
        gl.colorMask(1, 1, 1, 0);
        var texture = gl.createTexture();
        // Bind the texture to texture unit 0
        gl.bindTexture(bindingTarget, texture);
        // Set up texture parameters
        gl.texParameteri(bindingTarget, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(bindingTarget, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(bindingTarget, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
        gl.texParameteri(bindingTarget, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(bindingTarget, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // Upload the image into the texture
        gl.texImage3D(bindingTarget, 0, gl[internalFormat], bitmap.width, bitmap.height, 1 /* depth */, 0,
                      gl[pixelFormat], gl[pixelType], null);
        gl.texSubImage3D(bindingTarget, 0, 0, 0, 0, gl[pixelFormat], gl[pixelType], bitmap);

        var topColor = flipY ? redColor : greenColor;
        var bottomColor = flipY ? greenColor : redColor;

        // Draw the triangles
        wtu.clearAndDrawUnitQuad(gl, [0, 0, 0, 255]);

        // Check a few pixels near the top and bottom and make sure they have
        // the right color.
        debug("Checking lower left corner");
        wtu.checkCanvasRect(gl, 4, 4, 2, 2, bottomColor, "shouldBe " + bottomColor);
        debug("Checking upper left corner");
        wtu.checkCanvasRect(gl, 4, gl.canvas.height - 8, 2, 2, topColor, "shouldBe " + topColor);
    }

    function runTest()
    {
        var program = tiu.setupTexturedQuadWith3D(gl, internalFormat);
        runTestOnBindingTarget(gl.TEXTURE_3D, program);
        program = tiu.setupTexturedQuadWith2DArray(gl, internalFormat);
        runTestOnBindingTarget(gl.TEXTURE_2D_ARRAY, program);

        wtu.glErrorShouldBe(gl, gl.NO_ERROR, "should be no errors");
        finishTest();
    }

    function runTestOnBindingTarget(bindingTarget, program) {
        runOneIteration(bindingTarget, program, bitmaps.noFlipY, false);
        runOneIteration(bindingTarget, program, bitmaps.flipY, true);
    }

    return init;
}
