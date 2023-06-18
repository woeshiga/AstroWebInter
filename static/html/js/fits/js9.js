
var vertex_shader_src=//"attribute vec2 a_position;"+
"attribute vec4 vPosition;"+
    //"uniform sampler2D u_image;"+
    "uniform mat4 u_matrix;"+
    "void main() {"+
    //"gl_Position = u_matrix * vPosition;"+
    //"gl_Position = vec4(a_position, 0, 1);"+	
    //"gl_Position = vec4(vPosition[0],vPosition[1], 0, 1);"+	
    "gl_Position = vPosition;"+
    "}";


/*

  This is the fragment shader code where all the color/geometry computations are done. Optimization on memory use is done by using a single floating point rgba texture to reprensent all the data. The four 'channels' of a pixel element represent four different image layers. Geometry transformations are computed by the algorithm using a single texture. Each of the (R,G,B,A) components can be used to store data for individual layers. This is why this rendering program handles at most four image layers.
  
*/

var fragment_shader_src="precision mediump float;"+ //can change to higher precision here
"uniform float u_zoom;"+  //the passed zoom value from the html ui
"uniform float u_angle;"+ //the passed rotation value from the html ui
"uniform vec2 u_tr;"+ //Translations (x,y) vector[2] from the html ui

"uniform ivec4 u_layer_enabled;"+ //4 layers
"uniform vec4 u_test[2];"+
"uniform vec2 u_layer_range[4];"+
    "uniform vec4 u_pvals[8];"+
    //			"uniform ivec4 u_histo[128];"+
    "uniform ivec4 u_ncolors;"+ //Number of colours in the 4 layers

"uniform sampler2D u_image;"+ //The four layer float data texture
"uniform sampler2D u_cmap_fracs;"+ //Positions of the colour on the colormap â‚¬ [0,1] for each layer
"uniform sampler2D u_cmap_colors;"+//Color vector representing the colormaps for each layer.
"uniform vec2 u_resolution;"+
    "void main() {"+
    "  vec4 cmap_col=vec4(0.0,0.0,0.0,1.0);"+ //This is the final colour for this pixel, we set it initially to opaque black.
    "  mat2 rmg =mat2(cos(u_angle),sin(u_angle),-sin(u_angle),cos(u_angle));"+//Set up the global view rotation matrix
    "  for(int l=0; l<4; l++){"+ //Looping on the 4 layers 
    "   if(u_layer_enabled[l]==1){"+//If the layer is visible ...
    "    float lpos=(float(l)+.5)/4.0;"+
    "    float alpha=u_pvals[2*l+1][1];"+//this layer's angle
    "    mat2 rm =mat2(cos(alpha),sin(alpha),-sin(alpha),cos(alpha));"+//this layer's rotation matrix
    "vec2 trl=vec2(u_pvals[2*l][2],u_pvals[2*l][3]);"+//this layer's translation (x,y) vector
    "  vec2 texCoord = rmg*( (gl_FragCoord.xy/u_resolution-.5)/u_zoom) +u_tr/u_resolution +vec2(.5,.5);"+ //Setting the 2-vector (Tx,Ty)â‚¬[0,1] : the texture position for this layer, applying global transform.
    "texCoord = rm*(texCoord-trl/u_resolution-.5)/u_pvals[2*l+1][0]+vec2(.5,.5);"+//Applying layer's geometrical transforms.
//    "    if(texCoord[0]>=0.0 && texCoord[0]<=1.0 && texCoord[1]>=0.0 && texCoord[1]<=1.0){"+
    "    if(texCoord[0]>=0.0 && texCoord[0]<=u_layer_range[l][0] && texCoord[1]>=0.0 && texCoord[1]<=u_layer_range[l][1]){"+


    "      float c=(texture2D(u_image, texCoord)[l]-u_pvals[2*l][0])/(u_pvals[2*l][1]-u_pvals[2*l][0]);"+
    "      if(c<=0.0){cmap_col+=u_pvals[2*l+1][2]*texture2D(u_cmap_colors, vec2(0.5/128.0, lpos));} else {"+
    "        if(c>=1.0){cmap_col+=u_pvals[2*l+1][2]*texture2D(u_cmap_colors, vec2( (float(u_ncolors[l])-.5)/128.0, lpos));}else{"+
    "        float frl=0.0,frr; vec4 rc; vec4 lc;"+
    "        for(int i=0;i< 128 ;i++){ "+
    "          if(i==u_ncolors[l]){ break;}"+
    "          frr = texture2D(u_cmap_fracs, vec2((float(i)+.5)/128.0, lpos)).r;"+	
    "          rc = texture2D(u_cmap_colors, vec2((float(i)+.5)/128.0, lpos));"+
    "          if(frr>c){"+
    "            float dc=frr-frl;"+
    "            rc=(c-frl)/dc*rc;"+
    "            lc=(frr-c)/dc*lc;"+
    "            cmap_col+=(lc+rc)*u_pvals[2*l+1][2];"+
    "            break;"+
    "          }else{ frl=frr; lc=rc; }"+
    "        }"+//end for
    "      }"+//end else
    "     }"+//end else
    "   }"+ //end if (pixel visible)
    "  }"+ //end if (layer enabled)
    " }"+//end for
    " cmap_col[3]=.5;"+
    "for(int i=0;i<3;i++)if( cmap_col[i]>1.0)cmap_col[i]=1.0;"+ //if the color is too bright, set to max.
    " gl_FragColor = cmap_col;"+ //setting final fragment color
    "}"; //end main
    /*

      vec4 pack (float depth)
      {
      const vec4 bitSh = vec4(256 * 256 * 256,
      256 * 256,
      256,
      1.0);
      const vec4 bitMsk = vec4(0,
      1.0 / 256.0,
      1.0 / 256.0,
      1.0 / 256.0);
      vec4 comp = fract(depth * bitSh);
      comp -= comp.xxyz * bitMsk;
      return comp;
      }


      float unpack (vec4 colour)
      {
      const vec4 bitShifts = vec4(1.0 / (256.0 * 256.0 * 256.0),
      1.0 / (256.0 * 256.0),
      1.0 / 256.0,
      1);
      return dot(colour , bitShifts);
      }

    */

function run_test(use_float) {
    // Create canvas and context
    var canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    var gl = canvas.getContext("experimental-webgl");

    // Decide on types to user for texture
    var texType, bufferFmt;
    if (use_float) {
        texType = gl.FLOAT;
        bufferFmt = Float32Array;
    } else {
        texType = gl.UNSIGNED_BYTE;
        bufferFmt = Uint8Array;
    }

    // Query extension
    var OES_texture_float = gl.getExtension('OES_texture_float');
    if (!OES_texture_float) {
        throw new Error("No support for OES_texture_float");
    }

    // Clear
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Create texture
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 512, 512, 0, gl.RGBA, texType, null);

    // Create and attach frame buffer
    var fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.bindTexture(gl.TEXTURE_2D, null);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
        throw new Error("gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE");
    }

    // Clear
    gl.viewport(0, 0, 512, 512);
    gl.clear(gl.COLOR_BUFFER_BIT);
    var pixels = new bufferFmt(4 * 512 * 512);
    gl.readPixels(0, 0, 512, 512, gl.RGBA, texType, pixels);

    if (pixels[0] !== (use_float ? 1.0 : 255)) {
        throw new Error("pixels[0] === " + pixels[0].toString());
    }
}

function test_main() {
    run_test(false);
    console.log('Test passed using GL_UNSIGNED_BYTE');
    run_test(true);
    console.log('Test passed using GL_FLOAT');
}



function test_webclgl(fvp){      

    // FILL ARRAYS A AND B

    var _length = fvp.length;

    console.log("Testing webclgl Buffer length is " + _length ) ;

    
    // PERFORM A + B + SIMPLE NUM WITH GPU
    webCLGL = new WebCLGL();

    var offset = 100000; // to handle values from -100.0 to 100.0
    var buffer_A = webCLGL.createBuffer(_length, 'FLOAT', offset);
    //    var buffer_B = webCLGL.createBuffer(_length, 'FLOAT4', offset);

    var histo_size=256;
    var data_bounds=[];
    

    var buffer_C = webCLGL.createBuffer(1, 'FLOAT4', offset);
    webCLGL.enqueueWriteBuffer(buffer_A, A);
    //webCLGL.enqueueWriteBuffer(buffer_B, B);
    
    var kernel_add_source = 'void main(float* A'+
	') {'+
        'vec2 x = get_global_id();'+
        'vec4 _A = A[x];'+
	//        'vec4 _B = B[x];'+
        'out_float4 = _A+_B;'+
	'}';
    var kernel_add = webCLGL.createKernel(kernel_add_source);
    kernel_add.setKernelArg(0, buffer_A);
    kernel_add.setKernelArg(1, buffer_B);
    kernel_add.compile();
    
    webCLGL.enqueueNDRangeKernel(kernel_add, buffer_C); 
    
    
    var C_GPU = webCLGL.enqueueReadBuffer_Float4(buffer_C);
    document.getElementById('DIVC_GPU').innerText = C_GPU;
}

// Returns a transformation matrix as a flat array with 16 components, given:
// ox, oy, oz: new origin (translation)
// rx, ry, rz: rotation angles (radians)
// s: scaling factor
// d: distance between camera and origin after translation,
//     if d <= -n skips projection completely
// f: z coordinate of far plane (normally positive)
// n: z coordinate of near plane (normally negative)
// ar: aspect ratio of the viewport (e.g. 16/9)
// exz: if true exchanges X and Z coords after projection
function getTransformationMatrix(ox, oy, oz, rx, ry, rz, s, d, f, n, ar, exz)
{
    // Pre-computes trigonometric values
    var cx = Math.cos(rx), sx = Math.sin(rx);
    var cy = Math.cos(ry), sy = Math.sin(ry);
    var cz = Math.cos(rz), sz = Math.sin(rz);
    
    // Tests if d is too small, hence making perspective projection not possible
    if (d <= -n)
    {
	// Transformation matrix without projection
	return new Float32Array([
	    (cy*cz*s)/ar,cy*s*sz,-s*sy,0,
	    (s*(cz*sx*sy-cx*sz))/ar,s*(sx*sy*sz+cx*cz),cy*s*sx,0,
	    (s*(sx*sz+cx*cz*sy))/ar,s*(cx*sy*sz-cz*sx),cx*cy*s,0,
	    (s*(cz*((-oy*sx-cx*oz)*sy-cy*ox)-(oz*sx-cx*oy)*sz))/ar,
	    s*(((-oy*sx-cx*oz)*sy-cy*ox)*sz+cz*(oz*sx-cx*oy)),
	    s*(ox*sy+cy*(-oy*sx-cx*oz)),1    
	]);
    }
    else
    {
	// Pre-computes values determined with wxMaxima
	var A=d;
	var B=(n+f+2*d)/(f-n);
	var C=-(d*(2*n+2*f)+2*f*n+2*d*d)/(f-n);
	
	// Tests if X and Z must be exchanged
	if(!exz)
	{
	    // Full transformation matrix
	    return new Float32Array([
		(cy*cz*s*A)/ar,cy*s*sz*A,-s*sy*B,-s*sy,
		(s*(cz*sx*sy-cx*sz)*A)/ar,s*(sx*sy*sz+cx*cz)*A,cy*s*sx*B,cy*s*sx,
		(s*(sx*sz+cx*cz*sy)*A)/ar,s*(cx*sy*sz-cz*sx)*A,cx*cy*s*B,cx*cy*s,
		(s*(cz*((-oy*sx-cx*oz)*sy-cy*ox)-(oz*sx-cx*oy)*sz)*A)/ar,
		s*(((-oy*sx-cx*oz)*sy-cy*ox)*sz+cz*(oz*sx-cx*oy))*A,
		C+(s*(ox*sy+cy*(-oy*sx-cx*oz))+d)*B,s*(ox*sy+cy*(-oy*sx-cx*oz))+d
	    ]);
	}
	else
	{
	    // Full transformation matrix with XZ exchange
	    return new Float32Array([
		    -s*sy*B,cy*s*sz*A,(cy*cz*s*A)/ar,-s*sy,
		cy*s*sx*B,s*(sx*sy*sz+cx*cz)*A,(s*(cz*sx*sy-cx*sz)*A)/ar,cy*s*sx,
		cx*cy*s*B,s*(cx*sy*sz-cz*sx)*A,(s*(sx*sz+cx*cz*sy)*A)/ar,cx*cy*s,
		C+(s*(ox*sy+cy*(-oy*sx-cx*oz))+d)*B,s*(((-oy*sx-cx*oz)*sy-cy*ox)*sz+cz*(oz*sx-cx*oy))*A,
		(s*(cz*((-oy*sx-cx*oz)*sy-cy*ox)-(oz*sx-cx*oy)*sz)*A)/ar,s*(ox*sy+cy*(-oy*sx-cx*oz))+d
	    ]);
	}
    }
}

// creates a global "addWheelListener" method
// example: addWheelListener( elem, function( e ) { console.log( e.deltaY ); e.preventDefault(); } );
(function(window,document) {

    var prefix = "", _addEventListener, onwheel, support;

    // detect event model
    if ( window.addEventListener ) {
        _addEventListener = "addEventListener";
    } else {
        _addEventListener = "attachEvent";
        prefix = "on";
    }

    // detect available wheel event
    support = "onwheel" in document.createElement("div") ? "wheel" : // Modern browsers support "wheel"
    document.onmousewheel !== undefined ? "mousewheel" : // Webkit and IE support at least "mousewheel"
    "DOMMouseScroll"; // let's assume that remaining browsers are older Firefox

    window.addWheelListener = function( elem, callback, useCapture ) {
        _addWheelListener( elem, support, callback, useCapture );

        // handle MozMousePixelScroll in older Firefox
        if( support == "DOMMouseScroll" ) {
            _addWheelListener( elem, "MozMousePixelScroll", callback, useCapture );
        }
    };

    function _addWheelListener( elem, eventName, callback, useCapture ) {
        elem[ _addEventListener ]( prefix + eventName, support == "wheel" ? callback : function( originalEvent ) {
            !originalEvent && ( originalEvent = window.event );

            // create a normalized event object
            var event = {
                // keep a ref to the original event object
                originalEvent: originalEvent,
                target: originalEvent.target || originalEvent.srcElement,
                type: "wheel",
                deltaMode: originalEvent.type == "MozMousePixelScroll" ? 0 : 1,
                deltaX: 0,
                delatZ: 0,
                preventDefault: function() {
                    originalEvent.preventDefault ?
                        originalEvent.preventDefault() :
                        originalEvent.returnValue = false;
                }
            };
            
            // calculate deltaY (and deltaX) according to the event
            if ( support == "mousewheel" ) {
                event.deltaY = - 1/40 * originalEvent.wheelDelta;
                // Webkit also support wheelDeltaX
                originalEvent.wheelDeltaX && ( event.deltaX = - 1/40 * originalEvent.wheelDeltaX );
            } else {
                event.deltaY = originalEvent.detail;
            }

            // it's time to fire the callback
            return callback( event );

        }, useCapture || false );
    }
    
})(window,document);


var gl;
var canvas;
var program;
var sz,w,h,fv,bbig=null;
var texture;
var dinfo, dbar,cmap_el;
var cmap_texture,cmap_texdata;
var cmap_frac,cmap_fracdata;
var ncolors, pvals;
var layer_enabled;
var ctx;
var p_vals, p_layer_range;

window.onload = function(){
    
    dinfo=document.getElementById('data_info');
    dbar=document.getElementById('data_bar');
    cmap_el=document.getElementById('cuts');
    
    //  test_webclgl();

    //test_main();
    
    //  test_fits();
    //  return; 
    
    //  window.sadira=new sadira({}, function(error){}, function(connected){
    
    init();
    
    
    //test_fits();
    //   return;
    // });

}



/*
  vec4 pack_depth(const in float depth)
  {
  const vec4 bit_shift = vec4(256.0*256.0*256.0, 256.0*256.0, 256.0, 1.0);
  const vec4 bit_mask  = vec4(0.0, 1.0/256.0, 1.0/256.0, 1.0/256.0);
  vec4 res = fract(depth * bit_shift);
  res -= res.xxyz * bit_mask;
  return res;
  }

  float unpack_depth(const in vec4 rgba_depth)
  {
  const vec4 bit_shift = vec4(1.0/(256.0*256.0*256.0), 1.0/(256.0*256.0), 1.0/256.0, 1.0);
  float depth = dot(rgba_depth, bit_shift);
  return depth;
  }
*/


/*
  function makeTranslation(tx, ty) {
  return [
  1, 0, 0,
  0, 1, 0,
  tx, ty, 1
  ];
  }

  function makeRotation(angleInRadians) {
  var c = Math.cos(angleInRadians);
  var s = Math.sin(angleInRadians);
  return [
  c,-s, 0,
  s, c, 0,
  0, 0, 1
  ];
  }

  function makeScale(sx, sy) {
  return [
  sx, 0, 0,
  0, sy, 0,
  0, 0, 1
  ];
  }

  function writeMessage(canvas, message) {
  var context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = '18pt Calibri';
  context.fillStyle = 'black';
  context.fillText(message, 10, 25);
  }

*/

function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
	x: evt.clientX - rect.left,
	y: evt.clientY - rect.top
    };
}



// var layer_tpl = {

//     elements : {
// 	cuts : {
// 	    name : "Data cuts",
// 	    type : "array",
// 	    array_type : "float",
// 	    array_length : 2,
// 	    array_labels : ["Low","High"]
// 	},
// 	tr : {
// 	    name : "Translation",
// 	    type : "array",
// 	},
// 	lc : { name : "Low cut", type : "float" },
// 	hc : { name : "High cut", type : "float" },
	
//     }
// }

var def_colormaps=[
    [[0,0,0,1,0],[0.8,0.2,0.1,1.0,0.5],[1,1,1,1,1]],
    [[0,0,0,1,0],[0.2,0.8,0.1,1.0,0.5],[1,1,1,1,1]],
    [[0,0,0,1,0],[0.1,0.2,0.8,1.0,0.5],[1,1,1,1,1]],
    [[0,0,0,1,0],[0.1,0.8,0.2,1.0,0.5],[1,1,1,1,1]]
];


var def_parameters=[
    [0, //low cut
     5.0, //high cut
     0, //Tx
     0, //Ty
     1.0, //Scale
     0, //Rot
     1.0, //Luminosity
     0
    ],
    [0, //low cut
     20.0, //high cut
     0, //Tx
     0, //Ty
     1.0, //Scale
     0, //Rot
     1.0, //Luminosity
     0
    ],
    [0, //low cut
     5.0, //high cut
     0, //Tx
     0, //Ty
     1.0, //Scale
     0, //Rot
     1.0, //Luminosity
     0
    ],
    [0, //low cut
     2.0, //high cut
     0, //Tx
     0, //Ty
     1.0, //Scale
     0, //Rot
     1.0, //Luminosity
     0
    ]
];



function layer(id, update_shader_cb, update_cmap_cb){
    
    var lay=this;
    
    this.name=document.createElement("h2");
    this.id=id;

    lay.name.innerHTML="Layer " + lay.id + " : No data";
    var div=document.createElement("div"); div.className="layer";
    cmap_el.appendChild(div);
    
    this.div=div;
    
    var prms ={
	lc : { ui: document.createElement("input"),cap :"Low cut",id : 0,row : 0,cs:1 },
	hc : { ui:document.createElement("input"),cap:"High cut",id : 1,row : 0,cs:1},
	tx : { ui:document.createElement("input"),cap:"Tr X",id : 2,row : 0,cs:1},
	ty : { ui:document.createElement("input"),cap:"Tr Y",id : 3,row : 0,cs:1},
	zm : { ui:document.createElement("input"),cap:"Scale",id : 4,row : 0,cs:1},
	ag : { ui:document.createElement("input"),cap:"Angle",id : 5,row : 0,cs:1},
	lu : { ui:document.createElement("input"),cap:"Luminosity",id : 6,row : 1,cs:3}
    };
    
    prms.lu.ui.type="range";
    prms.lu.ui.min=0.0;
    prms.lu.ui.max=1.0;
    prms.lu.ui.step=0.01;
    prms.lu.ui.value=1.0;
    
    prms.lc.ui.type="number";
    prms.hc.ui.type="number";
    prms.tx.ui.type="number";
    prms.ty.ui.type="number";
    prms.zm.ui.type="number";
    prms.zm.ui.step=.05;
    
    prms.ag.ui.type="number";
    prms.ag.ui.step=.05;
    
    this.cmap=new colormap();  
    var cmap = this.cmap;
    
    //var cmap_data=cmap.json_colormap();
    
    
    var p_values=def_parameters[id];
    var hzoom_but=document.createElement("button");
    var hreset_but=document.createElement("button");

    var canvas_info  = document.getElementById('canvas_info');

    var x_domain=null;
    var brush=null;


    var nbins=512;


    var bsize=null; 

    //    var x_domain_full=null; //[low+.5*bsize,low+(nbins-.5)*bsize];

    hzoom_but.onclick=function(){
	x_domain = [brush.extent()[0],brush.extent()[1]];//
	compute_histogram(x_domain[0],x_domain[1]);
	draw_histogram();
    }
    
    
    hreset_but.onclick=function(){
	var low=lay.opts.ext[0];
	var high=lay.opts.ext[1];

	x_domain=[low+.5*bsize,low+(nbins-.5)*bsize];
	
	console.log("X DOM " + x_domain[0] + ", " + x_domain[1]);
	bsize=(high-low)/nbins;
	compute_histogram(x_domain[0],x_domain[1]);
	draw_histogram();
    }
    
    
    // [0, //low cut
    // 		  15.0, //high cut
    // 		  0, //Tx
    // 		  0, //Ty
    // 		  1.0, //Scale
    // 		  0, //Rot
    // 		  1.0, //Luminosity
    // 		  0
    // 		 ];
    
    div.appendChild(this.name);

    var file_input=document.createElement("input");

    file_input.type="file";

    div.innerHTML+="Choose a FITS file : ";
    div.appendChild(file_input);
    div.appendChild(document.createElement("output"));
    image_info=document.createElement("div");
    image_info.className="image_info";
    div.appendChild(image_info);
    
    function load_fits_file(result_cb) {
	
	var FITS = astro.FITS;
	
	// Define a callback function for when the FITS file is received
	var callback = function() {
	    
	    // Get the first header-dataunit containing a dataunit
	    var hdu = this.getHDU();
	    // Get the first header
	    var header = hdu.header;
	    // Read a card from the header
	    var bitpix = header.get('BITPIX');
	    // Get the dataunit object
	    var dataunit = hdu.data;
	    console.log("FITS OK "+dataunit);
	    
	    var opts={ dataunit : dataunit };
	    
	    // Get pixels representing the image and pass callback with options
	    dataunit.getFrame(0, function(arr, opts){// Get dataunit, width, and height from options
		var dataunit = opts.dataunit;
		var width = dataunit.width;
		var height = dataunit.height;
		
		// Get the minimum and maximum pixels
		var extent = dataunit.getExtent(arr);
		
		
		console.log("Frame read : D=("+width+","+height+")  externt " + extent[0] + "," + extent[1]);
		image_info.innerHTML="Dims : ("+width+", "+height+")";

		
		result_cb(null, { w : width, h : height, arr : arr, ext : extent});
		
		
	    }, opts);
	    
	    // Do some wicked client side processing ...
	}
	
	// Set path to FITS file
	//var url = "/some/FITS/file/on/your/server.fits";
	
	// Initialize a new FITS File object
	//var fits = new FITS(url, callback);
	
	// Alternatively, the FITS object may be initialized using the HTML File API.
	
	var FITS=astro.FITS;
	
	file_input.addEventListener('change', function (evt){
	    
	    var file = evt.target.files[0]; // FileList object
	    lay.name.innerHTML="Layer " + lay.id + " : " + file;
	    var fits = new FITS(file, callback);
	    // return;

	    // var reader = new FileReader();
	    
	    // reader.onload = function(e) {
	    // 	var arrayb = reader.result;
	    // 	console.log("ab = "+arrayb+"cb="+callback);
	    // 	console.log("fits = " + FITS);
	    // }
	    
	    // //reader.readAsArrayBuffer(file);//"/home/fullmoon/prog/nodejs/sadira.20/example_fits_files/example.fits");
	    // reader.readAsArrayBuffer(file);//"/home/fullmoon/prog/nodejs/sadira.20/example_fits_files/example.fits");
	    
	}, false);
	
	
    }

    //dinfo.innerHTML+="Requesting image binary data...<br/>";
    
    function draw_histogram(){
	
	var margin = {top: 20, right: 20, bottom: 30, left: 50};
	var width = 500 - margin.left - margin.right;
	var height = 150- margin.top - margin.bottom;
	var brg=null;
	var xmarg, xw, ymarg;
	var svg;

	var x = d3.scale.linear()//d3.time.scale()
	    .range([0, width]);
	
	var y = d3.scale.sqrt()
	    .range([height, 0]);
	
	var xAxis = d3.svg.axis()
	    .scale(x)
	    .orient("bottom");
	
	var yAxis = d3.svg.axis()
	    .scale(y)
	    .orient("left")
	    .ticks(5);
	
	brush = d3.svg.brush()
	    .x(x)
	    .on("brushend", brushed);
	
	var area = d3.svg.area()
	    .interpolate("step-before")
	    .x(function(d) { return x(d.x); })
	    .y0(height)
	    .y1(function(d) { return y(d.n); });
	
	
	lay.htd.innerHTML="";
	var bn=d3.select(lay.htd);
	//d3.select("svg").remove();

	svg = bn.append('svg'); //document.createElement("svg");
	
	//console.log('got the shit ' + bn + ' the svg ' + svg);
	//base_node.appendChild(svg.ownerSVGElement);
	
	svg.attr("width", width + margin.left + margin.right);
	svg.attr("height", height + margin.top + margin.bottom);
	
	// .append("g")
	// .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
	
	context = svg.append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
	
	
	var histo=lay.histo;
	if(x_domain==null){
	    x_domain=[histo[0].x*1.0,histo[histo.length-1].x*1.0];
	}
	
	x.domain(x_domain);//
	//x.domain([fv.viewer_cuts[0],fv.viewer_cuts[1]]);
	y.domain(d3.extent(lay.histo, function(d) { return d.n; }));
	
	
	
	var xsvg = context.append("g")
	    .attr("class", "x axis")
	    .attr("transform", "translate(0," + height + ")")
	    .call(xAxis);
	
	
	xmarg=margin.left; //this.getBBox().x;
	ymarg=margin.top; //this.getBBox().x;
	
	xsvg.each(function(){
	    //	 console.log("XAXIS: x=" + this.getBBox().x + " y=" + this.getBBox().y+ " w=" + this.getBBox().width+ " h=" + this.getBBox().height);
	    xw=this.getBBox().width;
	});	       
	
	
	var ysvg=context.append("g")
	    .attr("class", "y axis")
	    .call(yAxis)
	    .append("text")
	    .attr("transform", "rotate(-90)")
	    .attr("y", 6)
	    .attr("dy", ".71em")
	    .style("text-anchor", "end")
	    .text("Number of pixels");
	
	// ysvg.each(function(){
	// 		 console.log("YAXIS: x=" + this.getBBox().x + " y=" + this.getBBox().y+ " w=" + this.getBBox().width+ " h=" + this.getBBox().height);
	// 	     });	       
	
	var pathsvg=context.append("path")
	    .datum(lay.histo)
	    .attr("class", "line")
	//.attr("d", line);
	    .attr("d", area);
	
	// pathsvg.each(function(){
	// 		    console.log("PATH: x=" + this.getBBox().x + " y=" + this.getBBox().y+ " w=" + this.getBBox().width+ " h=" + this.getBBox().height);
	// 		});
	
	
	/*
	  fv.cmap.domnode.style.marginLeft=(xmarg-2.0)+'px';
	  fv.cmap.domnode.style.width=(xw+0.0)+'px';
	  fv.cmap.domnode.style.height=(50+0.0)+'px';
	  fv.cmap.domnode.style.marginTop='-10px';
	*/	       
	
	// cmap.display();
	
	var height2=height;
	
	brg=context.append("g")
	    .attr("class", "brush")
	    .call(brush);
	
	brg.selectAll("rect")
	    .attr("y", -6)
	    .attr("height", height2 + 7);
	
	brg.selectAll(".resize").append("path").attr("d", resizePath);
	
	//			   
	
	
	//base_node.appendChild(fv.cmap.domnode);
	
	
	//		   brush.extent([data[0].pixvalue*1.0,data[data.length-1].pixvalue*1.0]);
	brush.extent(x_domain);//[fv.viewer_cuts[0],fv.viewer_cuts[1]]);
	
	
	

	
	function resizePath(d) {
	    var e = +(d == "e"),
	    x = e ? 1 : -1,
	    y = height / 3;
	    
	    //brushed();
	    //x+=xmarg;
	    
	    return "M" + (.5 * x) + "," + y
		+ "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6)
		+ "V" + (2 * y - 6)
		+ "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y)
		+ "Z"
		+ "M" + (2.5 * x) + "," + (y + 8)
		+ "V" + (2 * y - 8)
		+ "M" + (4.5 * x) + "," + (y + 8)
		+ "V" + (2 * y - 8);
	    
	    
	}
	
	
	
	//brush.extent([2000,4000]);
	//svg.select(".brush").call(brush);		   
	brushed();
	
	//ready_function();
 	//brush(context);
	
	//$('#bottom_space')[0].innerHTML='<br/><br/>The End!<br/>';
	
	//   brush.extent([0.2, 0.8]);
	//  svg.select(".brush").call(brush);		   
	
	// var gBrush = g.append("g").attr("class", "brush").call(brush);
	// gBrush.selectAll("rect").attr("height", height);
	// gBrush.selectAll(".resize").append("path").attr("d", resizePath);
	
	function brushed() {
	    
	    // brush.extent();
	    
	    //	console.log("Helllo ! " );
	    prms.lc.ui.value=p_values[0]=brush.extent()[0];
	    prms.hc.ui.value=p_values[1]=brush.extent()[1];
	    
	    //console.log("Hello " + p_values[0] + ","+p_values[1]);
	    update_pvalues();
	    //low_cut.value=fv.viewer_cuts[0];
	    //high_cut.value=fv.viewer_cuts[1];
	    
	    
	    svg.select(".brush").call(brush);
	    
	    
	    if(brg!=null){
		
		
		//cmap.domnode.style.width=(brg[1].getBBox().width+0.0)+'px';
		//cmap.domnode.style.marginLeft=(brg[1].getBBox().x+xmarg)+'px';
		

		var bid=0;
		
		brg.selectAll("rect").each(function(){
		    
		    // brg.each(function(){
		    //console.log("BRUSH "+bid+": x=" + this.getBBox().x + " y=" + this.getBBox().y+ " w=" + this.getBBox().width+ " h=" + this.getBBox().height);
		    if(bid==1){
			cmap.domnode.style.width=(this.getBBox().width+0.0)+'px';
			cmap.domnode.style.marginLeft=(this.getBBox().x+xmarg)+'px';
			
		    }
		    bid++;
		    
		});	       	
		
	    }else
		console.log("brg is NULL !");
	    
	    //	    fv.cmap.display();
	    
	}
    }
    
    
    function compute_histogram(low, high){
	

	var bsize=(high-low)/nbins;
	
	var data=lay.opts.arr;
	var dl=data.length;
	var histo=lay.histo=[];
	
	

	for(var i=0;i<nbins;i++){
	    histo[i]={x: low+(i+.5)*bsize, n:0};
	}
	
	console.log("Data bounds : " + lay.opts.ext[0] + ", " + lay.opts.ext[1], " bin size = " + bsize);
	
	
	for(var i=0;i<dl;i++){
	    var v=data[i];
	    if(v>=low&&v<=high){
		var bid=Math.floor( (v-low)/bsize);
		if(bid>=0&&bid<nbins)
		    histo[bid].n++; 
	    }
	}
	
	//console.log("Histo : " + JSON.stringify(lay.histo));
	
    }  

    
    function update_pvalues(){
	var pv_loc=gl.getUniformLocation(program, "u_pvals");
	for(var p=0; p<8;p++) p_vals[lay.id*8+p]=p_values[p];
	//console.log("Setting parms for layer " + layer_id + " : " + JSON.stringify(p_vals));
	gl.uniform4fv(pv_loc, p_vals);
	prms.zm.ui.step=prms.zm.ui.value/10.0;
	
	render();
    }

    
    function setup_layer_data(fv){

	console.log("Setting up layer " + lay.id + "... " + w + ", " + h);
	
	
	p_values[0]=lay.opts.ext[0];
	p_values[1]=lay.opts.ext[1];
	
	//x_domain_full=[p_values[0]+.5*bsize,p_values[0]+(nbins-.5)*bsize];
	compute_histogram(p_values[0],p_values[1]);
	
	//if(bsize==null)
	bsize=(p_values[1]-p_values[0])/nbins;

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.FLOAT, fv);
	gl.uniform1i(gl.getUniformLocation(program, "u_image"), 0);
	
	
	var check_enabled=document.createElement("input");
	check_enabled.type="checkbox";
	check_enabled.checked=true;
	lay.name.prependChild(check_enabled);
	
	check_enabled.onclick=function(){
	    
	    layer_enabled[lid]=this.checked;
	    
	    var le_loc=gl.getUniformLocation(program, "u_layer_enabled");
	    gl.uniform4iv(le_loc, layer_enabled);
	    
	    //alert(this.checked + " lid= "+lid  + " : " + layer_enabled[lid]);
	    render();
	}
	
	var tab=document.createElement("table");
	div.appendChild(tab);
	
	var th=[document.createElement("tr"),document.createElement("tr")];
	var tr=[document.createElement("tr"),
		document.createElement("tr"),
		document.createElement("tr"),
		document.createElement("tr"),
		document.createElement("tr")];
	tab.appendChild(th[0]);
	tab.appendChild(tr[0]);
	tab.appendChild(th[1]);
	tab.appendChild(tr[1]);
	tab.appendChild(tr[2]);
	tab.appendChild(tr[3]);
	tab.appendChild(tr[4]);
	
	var cap=document.createElement("td"); 
	cap.innerHTML="Color segment";
	cap.colSpan="3";
	th[1].appendChild(cap);
	
	var cap=document.createElement("td"); 
	cap.colSpan="3";
	cap.appendChild(cmap.colornode);
	tr[1].appendChild(cap);
	
	var cmt=document.createElement("td");
	cmt.colSpan="6";
	cmt.appendChild(cmap.domnode);
	tr[2].appendChild(cmt);
	
	for(var p in prms){
	    var cap=document.createElement("td"); 
	    cap.colSpan=prms[p].cs;
	    cap.innerHTML=prms[p].cap;
	    th[prms[p].row].appendChild(cap);
	}
	
	for(var p in prms){
	    var td=document.createElement("td");
	    td.colSpan=prms[p].cs;
	    var ui=prms[p].ui;
	    
	    td.appendChild(ui);
	    
	    tr[prms[p].row].appendChild(td);
	    ui.value=p_values[prms[p].id];
	    ui.layer=lay;
	    ui.id=prms[p].id;
	    
	    ui.onchange=function(){
		//console.log("Change pvals[" + this.layer.id + "]["+this.id+"]=" + this.value);
		p_values[this.id]=this.value;
		//update_shader_cb(this.layer.p_values, this.layer.id);


		
		
		update_pvalues();
		
	    }
	    
	    ui.onchange();
	    //update_shader_cb(this.p_values, lay.id);
	}
	
	
	lay.htd=document.createElement("td");
	lay.htd.colSpan="6";
	//htd.style.backgroundColor="white";
	tr[3].appendChild(lay.htd);
	draw_histogram();

	var tdzoom=document.createElement("td");
	var tdreset=document.createElement("td");
	tdzoom.colSpan="3";
	tdreset.colSpan="3";
	tr[4].appendChild(tdzoom);
	tr[4].appendChild(tdreset);
	
	tdzoom.appendChild(hzoom_but);
	tdreset.appendChild(hreset_but);

	hzoom_but.innerHTML="Zoom in selection";
	hreset_but.innerHTML="Reset histogram";


	cmap.create_colors(def_colormaps[id]);
	//cmap.last.insert_color([0.0,0.4,0.0,1.0], 0.5);
	cmap.select_element(cmap.last);
	//cmap.json_colormap();
	//cmap.domnode.style.width=cmap.domnode.offsetWidth;
	//cmap.domnode.style.width=300+"px";
	//console.log("w = " + cmap.domnode.style.width);
	
	//console.log("First items : " + fv[0] + ", " + fv[1] + ", " + fv[2] + ", " + fv[3] + ", " + fv[4] + ", " + fv[5] );
	//init();
	//var endcol=[0,0,0,1.0];
	//endcol[id%3]=1.0;
	cmap.update_callback=function(){
	    
	    
	    var cmap_data=cmap.json_colormap();				
	    ncolors[lay.id]=cmap_data.length;
	    
	    var of=128*4*lay.id;
	    for(var cmi=0;cmi<cmap_data.length;cmi++){
		var c=cmap_data[cmi];
		for(var k=0;k<4;k++)
		    cmap_texdata[of+4*cmi+k]=c[k];
		cmap_fracdata[of+4*cmi]=c[4];
	    }
	    for(var cmi=cmap_data.length;cmi<128;cmi++){
		for(var k=0;k<4;k++)
		    cmap_texdata[of+4*cmi+k]=-1.0;
		cmap_fracdata[of+4*cmi]=-1;
	    }
	    
	    // for(var k=0;k<4;k++){
	    //     console.log("Layer " + k + " nc=" + ncolors[k] );
	    //     for(var cmi=0;cmi<ncolors[k];cmi++){
	    // 	console.log("L"+k+" C"+cmi + "=" + cmap_texdata[k*128*4+cmi*4]+","+ cmap_texdata[k*128*4+cmi*4+1]+","+ cmap_texdata[k*128*4+cmi*4+2]+","+ cmap_texdata[k*128*4+cmi*4+3]+"" );
	    //     }
	    // }
	    
	    //console.log("NCOLORS="+JSON.stringify(ncolors));
	    var ncolors_loc = gl.getUniformLocation(program, "u_ncolors");
	    gl.uniform4iv(ncolors_loc, ncolors);
	    
	    gl.activeTexture(gl.TEXTURE1);
	    gl.bindTexture(gl.TEXTURE_2D, cmap_texture);
	    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 128, 4, 0, gl.RGBA, gl.FLOAT, cmap_texdata);
	    gl.uniform1i(gl.getUniformLocation(program, "u_cmap_colors"), 1);
	    
	    gl.activeTexture(gl.TEXTURE2);
	    gl.bindTexture(gl.TEXTURE_2D, cmap_frac);
	    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 128,4, 0, gl.RGBA, gl.FLOAT, cmap_fracdata);
	    gl.uniform1i(gl.getUniformLocation(program, "u_cmap_fracs"), 2);
	    
	    
	    render();
	    
	    //console.log("Update colormap for layer "+layer_id + "cm="+JSON.stringify(cmap_data) + " OK" );
	    
	}
	
	cmap.display();
	
	//	console.log("Cmap update for " + lay.id);
	//	update_cmap_cb(lay.cmap.json_colormap(), lay.id);
    }
    
    
    
    // if(opts.source=="sadira"){
    
    //   var d= sadira.dialogs.create_dialog({ handler : "fits.test_get_data"});
    
    //   //var image_data;
    //   d.lay_id=this.id;
    
    //   d.srz_request=function(dgram, result_cb){
    
    //     if(bbig==null){
    
    // 	sz=dgram.header.sz;
    // 	w=dgram.header.width;
    // 	h=dgram.header.height;
    
    // 	bbig=new ArrayBuffer(4*sz);
    // 	fv = new Float32Array(bbig);
    // 	for(var i=0;i<fv.length/4;i++){
    // 	  fv[4*i]=0.0;
    // 	  fv[4*i+1]=0.0;
    // 	  fv[4*i+2]=0.0;
    // 	  fv[4*i+3]=1.0;
    // 	}
    //     }
    
    //     lay.layer_name=dgram.header.name;
    //     dinfo.innerHTML+="Ready to receive "+sz +" bytes. Image ["+dgram.header.name+"] size will be : " + w + ", " + h + "<br/>";
    
    //     var b=new ArrayBuffer(sz);
    //     var fvp = new Float32Array(b);


    //     console.log("AB: N= "+ fv.length +" =? "+sz/4+" first elms : " + fv[0] + ", " + fv[1] );
    //     var sr=new srz_mem(b);
    //     sr.lay_id=d.lay_id;
    
    //     sr.on_chunk=function(dgram){
    // 	lay.name.innerHTML="Fetching data "+
    // 	    		   " : "+(Math.floor(100*( (dgram.header.cnkid*sr.chunk_size)/sr.sz_data)))+" %";
    //     }
    
    //     sr.on_done=function(){
    // 	  var lid=sr.lay_id;
    
    // 	  //test_webclgl(fvp);
    
    

    // 	  for(var i=0;i<fvp.length;i++){
    // 	    fv[4*i+lid]=fvp[i];
    // 	  // fv[4*i+1]=0;
    // 	  // fv[4*i+2]=0;
    // 	  // fv[4*i+3]=0;
    // 	  // console.log("v="+fvp[i]);
    // 	}
    // 	setup_layer_data(fv);
    //     };

    //     result_cb(null, sr);

    //   };
    
    //   d.connect(function(error, init_dgram){
    //     if(error)
    //     dinfo.innerHTML+="Init data error= " + error + " init datagram = <pre> " + JSON.stringify(init_dgram,null,4)+" </pre><br/>";
    
    //     else{
    
    // 	lay.name.innerHTML+="Dialog handshake OK <br/>";
    
    // 	d.send_datagram({type : "get_data", imgid : lay.id},null,function(error){
    // 	  if(error){
    // 	    dinfo.innerHTML+="ERROR"+error+" <br/>";
    // 	  }
    
    // 	});
    //     }
    
    //   });
    // }
    
    
    if(true == true){

	load_fits_file(function(error, res){
	    lay.opts=res;
	    
	    if(bbig==null){
		
		var p2w=1,p2h=1;
		while(p2w < res.w) p2w*=2;
		while(p2h < res.h) p2h*=2;
		
		w=p2w;
		h=p2h;

		canvas_info.innerHTML="GL texture ("+ w + ", " + h + ")";
		
		bbig=new ArrayBuffer(4*4*w*h);
		fv = new Float32Array(bbig);
		for(var i=0;i<fv.length/4;i++){
		    fv[4*i]=0.0;
		    fv[4*i+1]=0.0;
		    fv[4*i+2]=0.0;
		    fv[4*i+3]=1.0;
		}

		var resolutionLocation = gl.getUniformLocation(program, "u_resolution");
		gl.uniform2f(resolutionLocation, w, h);
		//gl.uniform2f(resolutionLocation, canvas.width, canvas.height);

		
	    }
	    var id=lay.id;

	    console.log("Filling big array with layer  " + id + " : " + res.w + ", " + res.h + " global dims " + w + ", "+h);

	    var rangeLocation = gl.getUniformLocation(program, "u_layer_range");
	    p_layer_range[2*id]=res.w*1.0/w;
	    p_layer_range[2*id+1]=res.h*1.0/h;

	    gl.uniform2fv(rangeLocation, p_layer_range);

	    for(var i=0;i<res.h;i++){
		for(var j=0;j<res.w;j++){
		    fv[4*(i*w+j)+id]=1.0*res.arr[i*res.w+j];
		}
	    }
	    
	    //lay.opts=opts;
	    
	    setup_layer_data(fv);
	    
	})
	
    }
    
    

    //var cuts=[0,2]; //pv[0] 0,1
    //var tr=[0,0]; //pv[0] 2,3
    //var zoom=1.0; //pv[1] 0
    //var angle=0.0;//pv[1] 1


    /*
      var cuts_loc = gl.getUniformLocation(program, "u_cuts");
      var zoom_loc=gl.getUniformLocation(program, "u_zoom");
      var angle_loc=gl.getUniformLocation(program, "u_angle");
      var tr_loc=gl.getUniformLocation(program, "u_tr");
      gl.uniform2f(cuts_loc, cuts[0], cuts[1]);
      gl.uniform2f(tr_loc, tr[0], tr[1]);
      gl.uniform1f(angle_loc, angle);
      gl.uniform1f(zoom_loc, zoom );
    */
}


function render() {

    //window.requestAnimationFrame(render, canvas);

    gl.clearColor(1.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    var positionLocation = gl.getAttribLocation(program, "vPosition");
    //    var positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    
    //    gl.uniform3fv(gl.getUniformLocation(program, "colors"), colors);

    var translation=[0,0,0];
    var matrix_loc = gl.getUniformLocation(program, "u_matrix");

    
    gl.uniformMatrix4fv(matrix_loc, false, getTransformationMatrix(translation[0], translation[1], translation[2], 0, 0.0, 0, 1.0, 5.0, 15.0, -2.0, 1.0, false));

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    /*

      var data   = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">' +
      '<foreignObject width="100%" height="100%">' +
      '<div xmlns="http://www.w3.org/1999/xhtml" style="font-size:40px">' +
      '<em>I</em> like <span style="color:white; text-shadow:0 0 2px blue;">cheese</span>' +
      '</div>' +
      '</foreignObject>' +
      '</svg>';

      var DOMURL = window.URL || window.webkitURL || window;

      var img = new Image();
      var svg = new Blob([data], {type: 'image/svg+xml;charset=utf-8'});
      var url = DOMURL.createObjectURL(svg);

      img.onload = function () {
      ctx.drawImage(img, 0, 0);
      DOMURL.revokeObjectURL(url);
      }

      img.src = url;
    */

}




function init() {
    
    var glexts  = document.getElementById('exts');
    var pointer_info  = document.getElementById('pointer_info');


    var canvas_info  = document.getElementById('canvas_info');
    canvas_info.className="canvas_info";
    
    canvas        = document.getElementById('glscreen');
    gl            = canvas.getContext('experimental-webgl');
    // canvas.width  = w;
    // canvas.height = h;
    canvas.width  = 600;
    canvas.height = 600;
    
    ctx    = canvas.getContext('2d');
    
    var mouseon = false;
    var mouse_start={};
    var t_start=[];

    canvas.onmousedown = function(e){
	mouseon = true;
	
	mouse_start.x=e.screenX;
	mouse_start.y=e.screenY;

	t_start[0]=tr[0];
	t_start[1]=tr[1];
    }

    canvas.onmouseup = function(e){
	//if(mouseon) mouseClick(e);
	mouseon = false;
    }

    // canvas.onmousemove = function(e){
    canvas.addEventListener("mousemove", function(e){
	
	pointer_info.innerHTML=" X:" + e.screenX + " Y:" + e.screenY;

	if(!mouseon) return;
	
	var mouse_delta=[e.screenX-mouse_start.x,e.screenY-mouse_start.y];
	
	tr[0]=t_start[0]-mouse_delta[0]/zoom;
	tr[1]=t_start[1]+mouse_delta[1]/zoom;
	
	tx.value=mouse_delta[0];
	ty.value=mouse_delta[1];
	
	gl.uniform2f(tr_loc, tr[0],tr[1]);
	render();
	return false;
    });
    
    
    function update_zoom(){
	gl.uniform1f(zoom_loc, zoom);
	zm.step=zm.value/10.0;
	render();

    }

    function mouse_wheel(e) {

	var e = window.event || e;

	//var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
	var delta=e.deltaY;
	//console.log("wheel : " + delta);

	(delta > 0)?zoom-=zoom/10.0 : zoom+=zoom/10.0;
	update_zoom();	    
	zm.value=zoom;
	
	//canvas.style.width = Math.max(sq.zoom, Math.min(sq.nw, canvas.width + (sq.zoom * delta))) + "px";

	e.preventDefault();
    }


    addWheelListener( canvas, mouse_wheel);
    canvas.focus();
    
    var available_extensions = gl.getSupportedExtensions();
    //glexts.innerHTML="<pre>"+JSON.stringify(available_extensions,null,4)+"</pre>";
    
    var floatTextures = gl.getExtension('OES_texture_float');
    if (!floatTextures) {
	alert('no floating point texture support');
	return;
    }
    
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 1, gl.FLOAT, false, 0, 0);
    
    gl.bufferData(
	gl.ARRAY_BUFFER, 
	new Float32Array([
		-1.0, -1.0, 
	    1.0, -1.0, 
		-1.0,  1.0, 
		-1.0,  1.0, 
	    1.0, -1.0, 
	    1.0,  1.0]), 
	gl.STATIC_DRAW
    );

    
    vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertex_shader_src);
    gl.compileShader(vertexShader);
    
    fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragment_shader_src);
    gl.compileShader(fragmentShader);
    
    program = gl.createProgram();
    
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);


    layer_enabled = new Int32Array([1,0,0,0]);
    //var layers =[];
    //var nlayers=1;

    p_vals=new Float32Array(4*8);
    p_layer_range=new Float32Array(4*2);
    ncolors=new Int32Array([0,0,0,0]);
    
    cmap_texdata = new Float32Array(16*128);
    cmap_fracdata = new Float32Array(16*128);

    var le_loc=gl.getUniformLocation(program, "u_layer_enabled");
    gl.uniform4iv(le_loc, layer_enabled);

    //var max_colors=128;

    var resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    //gl.uniform2f(resolutionLocation, canvas.width, canvas.height);


    texture = gl.createTexture();
    cmap_texture = gl.createTexture();
    cmap_frac = gl.createTexture();


    // gl.activeTexture(gl.TEXTURE1);
    // gl.bindTexture(gl.TEXTURE_2D, cmap_texture);
    // gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

    // gl.activeTexture(gl.TEXTURE2);
    // gl.bindTexture(gl.TEXTURE_2D, cmap_frac);
    // gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

    var zoom_loc=gl.getUniformLocation(program, "u_zoom");
    var angle_loc=gl.getUniformLocation(program, "u_angle");
    var tr_loc=gl.getUniformLocation(program, "u_tr");

    var zoom=1.0;
    var angle=0.0;
    var tr=[0,0];


    // var test_loc=gl.getUniformLocation(program, "u_test");
    // var testf=new Float32Array(nlayers*8);
    // gl.uniform4fv(test_loc, testf);
    
    //gl.uniform4f(le_loc, 1.0, 0.0, 0.0, 0.0);
    
    var zm=document.getElementById('zoom');
    var tx=document.getElementById('tx');
    var ty=document.getElementById('ty');
    var ag=document.getElementById('angle');
    
    tx.value=tr[0];
    ty.value=tr[1];
    ag.value=angle;    
    zm.value=zoom;

    gl.uniform1f(zoom_loc, zoom );
    gl.uniform1f(angle_loc, angle);
    gl.uniform2f(tr_loc, tr[0], tr[1]);


    zm.onchange=function(){
	zoom=this.value;
	update_zoom();
    }

    ag.onchange=function(){
	angle=this.value;
	gl.uniform1f(angle_loc, angle);
	render();
    }

    tx.onchange=function(){
	tr[0]=this.value;
	gl.uniform2f(tr_loc, tr[0],tr[1]);
	render();
    }
    ty.onchange=function(){
	tr[1]=this.value;
	gl.uniform2f(tr_loc, tr[0],tr[1]);
	render();
    }
    
    //    for(var i=0;i <4;i++) 

    //var opts = {source : "sadira"};
    var opts = {source : "fits"};

    var nlayers=0, maxlayers=4;
    var newlayer=document.getElementById("newlayer");
    
    newlayer.onclick=function(){
	if(nlayers<maxlayers){
	    var l=new layer(nlayers,opts,
			    function(p_values, layer_id){
			    },
			    function(cmap_data, layer_id){
			    }
			   );
	    
	    layer_enabled[nlayers]=1;
	    var le_loc=gl.getUniformLocation(program, "u_layer_enabled");
	    gl.uniform4iv(le_loc, layer_enabled);

	    nlayers++;
	    
	}else alert("Max 4 layers!");
    }
    
    
    //   function config_layer(i, cb){
    //     if(layer_enabled[i]===1){
    

    //       if(opts.source=="fits"){
    // 	test_fits(function(error, res){
    
    // 	    res.source="fits";
    // /*	  opts.w=res.w;
    // 	  opts.h=res.h;
    // 	  opts.arr=res.arr;
    // 	    opts.ext=res.ext; */
    
    // 	  var l=new layer(i,res,
    // 			  function(p_values, layer_id){
    // 	  },
    // 			  function(cmap_data, layer_id){
    
    // 	  }
    // 			  );
    
    // 	});
    //       }
    //       else{
    // 	var l=new layer(i,opts,
    // 			function(p_values, layer_id){
    // 	},
    // 			function(cmap_data, layer_id){
    
    // 	}
    // 			);
    //       }
    
    //       //l.cmap.display();
    
    //     }
    //   }
    
    
    //   async.parallel([
    //     function(cb){config_layer(0, cb);},
    //     function(cb){config_layer(1, cb);},
    //     function(cb){config_layer(2, cb);},
    //     function(cb){config_layer(3, cb);}
    //   ],function(error, results){
    //     //console.log("Results : " + JSON.stringify(results));
    //     //reply("ncpu", results );
    //   } );
    
    
    return;
    
    // var texinit=false;
    
    // cmap.update_callback=function(){
    //   cmap_data=cmap.json_colormap();
    
    //   //console.log("Cmap changed ! " + JSON.stringify(cmap_data));
    //   if(!texinit){
    
    //     canvas.addEventListener('mousemove', function(evt) {
    // 	var mousePos = getMousePos(canvas, evt);
    // 	var message = 'Mouse position: ' + mousePos.x + ',' + mousePos.y;
    // 	//writeMessage(canvas, message);
    // 	//console.log(message);

    //     }, false);
    
    //     texinit=true;
    //   }
    //   render();
    // }
    
    

}

// var colors = new Float32Array([
//     1, 0, 0, // red
//     0, 1, 0, // blue
//     0, 0, 1 // green
// ]);

// var img_data=new Float32Array(1024*1024);
// for(var i=0;i<img_data.length;i++){
//     img_data[i]=(i%640)/640.0;
// }


//var buffer;





