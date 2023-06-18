
function hex2rgb(hex) {
    
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
	
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function rgb2hex(r, g, b) {
    
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);

}

function colormap_element (color, frac, cmap){
    LinkedList.Node.call(this);
    
    this.cmap=cmap;    
    this.color = clone_obj(color);
    this.frac=frac;
}

colormap_element.prototype = new LinkedList.Node();
colormap_element.prototype.constructor = colormap_element;


function colormap(){
    
    LinkedList.dlink.call(this);
    
    //    this.basenode=base_node;

    this.data_bounds=[];
    this.elements = [];
//    this.width = 400;
    
    /*
      this.domnode=document.createElement('div');
      this.domnode.style.width = this.width+'px';
      this.domnode.style.height = '80px';
      this.domnode.style.border = '0px solid red';    
    */
    
    //    this.domnode.style.float='none';//xmarg;
    //    this.domnode.style.position='relative';//xmarg;
    //    this.domnode.style.marginLeft=200;//xmarg;
    //    this.domnode.style.paddingLeft=200;//xmarg;
    
    
    
    this.colornode=document.createElement('div');
    this.colornode.style.border="0px solid black";
    

    this.domnode=document.createElement('ul');
    this.domnode.className='colul';

//this.domnode=this.colul;

//    this.domnode.appendChild(this.colul);
    
    this.start_color = document.createElement('input');
    this.start_color.type='color';
//    this.start_color.id='start_color';
   // this.start_color.style.verticalAlign='middle';

    
     
    
    this.start_range =document.createElement('input');
    this.start_range.type='number';
    this.start_range.min='0';
    this.start_range.max='1';
    this.start_range.step='0.05';
   
    this.end_color =document.createElement('input');
    this.end_color.type='color';
    this.end_color.style.verticalAlign='middle';

    this.start_color.onchange = function(){
	//	console.log("Change ! + ");
	clr=this.value;
	cmap.selected_element.prev.set_hex_color(clr);
	cmap.update_callback();
    }


    this.end_color.onchange = function(){
//	console.log("Change ! + ");
	clr=this.value;
	cmap.selected_element.set_hex_color(clr);
	cmap.update_callback();
    }

			      
    this.end_range =document.createElement('input');
    this.end_range.type='number';
    this.end_range.min='0';
    this.end_range.max='1';
    this.end_range.step='0.05';


    
//    this.colornode.innerHTML+="Start : <input type='color' id='start_color'></input> level <input type='number' id='start_range' min='0' max='1.0' step='0.05'> </input>";
//    this.colornode.innerHTML+="End   : <input type='color' id='end_color'></input> level <input type='number' id='end_range' min='0' max='1.0' step='0.05'> </input>";

    this.mousexstart=0;
    this.lastfrac=0;

    this.mousemove=0;
    this.mouse_object=null;
    this.selected_element=null;

    var cmap=this;

    this.domnode.onmousemove = function(e) {
	if(cmap.mousemove){
	    
	    cmap.mouse_object.update_mouse(e);
	    cmap.update_callback();
	}
    }
    
    
    this.domnode.onmouseup = function(e) {
	//console.log("Mouse UP ???");
	if(cmap.mousemove){
	    //console.log("Mouse UP !");
	    
	    cmap.mouse_done(e);	    
	}
    }

    // this.domnode.onmouseout = function(e) {
    // 	//console.log("Mouse UP ???");
    // 	if(cmap.mousemove){
    // 	    //console.log("Mouse UP !");
    // 	    cmap.mouse_done(e);	    
	    
    // 	}
    // }

    var ul,li;

    ul=this.colornode.appendChild(document.createElement('ul')); 
    ul.className='colormap_items';

    this.menu=ul;

    li=ul.appendChild(document.createElement('li')); 
    
    var sp;
    // sp=li.appendChild(document.createElement('span'));
    // sp.innerHTML='Start';
    // sp.className='colormap_items';

    // sp.style.width='80px';

    li.appendChild(this.start_color); 
 //   li.appendChild(this.start_range); 

    li=ul.appendChild(document.createElement('li')); 

    // sp=li.appendChild(document.createElement('span'));
    // sp.innerHTML='End';
    // sp.className='colormap_items';
    //sp.style.width='80px';

    li.appendChild(this.end_color); 
//    li.appendChild(this.end_range); 

    li=ul.appendChild(document.createElement('li')); 
    var split_button=li.appendChild(document.createElement('button'));

    split_button.innerHTML="Split"; 

    split_button.onclick=function(){
    	if(cmap.selected_element!=null){
    	    cmap.selected_element.split(cmap);
    	    cmap.display();
	    
    	}else
    	    console.log("No selected element !");
    }
    

    // var json_button=li.appendChild(document.createElement('button'));

    // json_button.innerHTML='JSON';

    // json_button.onclick=function(){
    // 	var jstr=cmap.json_colormap();
    // 	//console.log("Ok json is " + jstr);
    //  	$('#json_cmap').text(jstr);
	
    // }
    
    // this.colornode.appendChild(document.createElement('span')).id='json_cmap';
    

    
    /*
      $('#start_color').spectrum
      ({
      color: "#f00",
      showAlpha: true,
      showPalette: true,
      showInitial: true,
      preferredFormat: "rgb",
      
      change: function(color) {
      console.log("STARTCOL: changing color of " + selected_element.debug() );
      
      if(selected_element!=null){
      selected_element.change_start_color(color);
      
      console.log("<br>STARTCOL: AFTER : changing color of " + selected_element.debug() );
      
      }else
      console.log("No selected element !");
	     
      }
      });
    */  

}



colormap.prototype = new LinkedList.dlink();

colormap.prototype.constructor = colormap;


colormap.prototype.select_element=function(e){
    //console.log("Selecting "+ e.debug());
    
    e.update_color_selection();
    this.selected_element=e;
}

colormap.prototype.move=function(x,y,w,h){
    this.domnode.marginLeft=x+'px';
    this.domnode.marginTop=y+'px';
    this.domnode.width=w+'px';
    this.domnode.height=h+'px';
}

colormap.prototype.display=function(){
  
  if(this.length<2){
    console.log("Not enough colours to display");
    return;
  }
  //console.log("Display " + this.length + " colors....");
  this.domnode.innerHTML="";	
  
  var itr = this.first.next;
  
  while(itr!=null){
    //console.log("Display " + itr.debug());
    itr.display();
    itr=itr.next;
  }
  
  //    this.domnode.innerHTML+='<br style="clear: left;" />';
  
  this.update_callback();
  //console.log("HTML is " + this.domnode.innerHTML);
}

colormap.prototype.set_databounds = function(db){
    this.data_bounds=db;
}
	

colormap.prototype.create_colors = function(colors){
    if(length!=0){
	console.log("already created!");
	return;
    }
    
  for(var i=0;i<colors.length;i++){
    this.append(new colormap_element(colors[i], colors[i][4], this));
  }

}


colormap.prototype.create = function(start_color, end_color){
    
    if(length!=0){
	console.log("already created!");
	return;
    }
    
    this.append(new colormap_element(start_color, 0.0, this));
    this.append(new colormap_element(end_color, 1.0, this));
    
}

colormap.prototype.update_colors = function(){

    var itr = this.first.next;

    while(itr!=null){
	itr.update_colors();
	itr=itr.next;
    }
}


colormap.prototype.json_colormap = function(){

    var jstr=[];

    //jstr='"colormap" : ['; 
//    var c;
    var color_id=0;
    var itr = this.first;

    while(itr!=null){

	jstr[color_id]=itr.color;
	jstr[color_id][4]=itr.frac;
	// jstr+='[';
	// for(var c=0;c<4;c++){
	//     jstr+=itr.color[c]; jstr+=',';
	// }
	// jstr+=itr.frac;
	// jstr+=']';

	color_id++;
	itr=itr.next;
//	if(itr!=null)	jstr+=',';
    }
    
//    jstr+=']';

   
    
    return jstr;
}


colormap_element.prototype.insert_color=function(c, frac){

    if(!this.prev){
	console.log("No left element!");
	return;
    }
    
    if(frac<=this.prev.frac || frac>=this.frac){
	console.log("Out of bound frac !" + frac);
	return;
    }
    

    this.cmap.insertAfter(this.prev,new colormap_element(c,frac, this.cmap));
    
}


//------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------
//------------------------------------------------------------------------------------------------------------------------------

colormap_element.prototype.debug = function(){

    var cs='',c;
    
    for(c=0;c<4;c++){
	cs+= Math.floor( (this.color[c]*255) );
	if(c!=3){ cs+=','; }
    }
    var w= ( typeof this.cmenode == 'undefined')? -1 : this.cmenode.style.width;
    return 'Frac= '+ this.frac  +" -> color : "+cs + " w= "+ w;
}


colormap_element.prototype.update_colors = function(){
  
  if(this.prev==null) return;
  
  
  //    console.log("Before: Update colors of "+ this.debug());
  
  var cs='',ce='',c;
  
	
  for(c=0;c<4;c++){
    cs+= Math.floor( (this.prev.color[c]*255) );
    ce+= Math.floor( (this.color[c]*255) );
    if(c!=3){ cs+=','; ce+=','; }
  }
  
  //console.log("node is "+ JSON.stringify(this.cmap.domnode.style) );
  var globw=this.cmap.domnode.style.width;    //this.cmap.domnode.offsetWidth

  var new_w=Math.floor((this.frac-this.prev.frac)*parseInt(globw,10) );
  
  //console.log("setting new w = " + new_w + " glob w= [" + globw + "] offsetW=" + this.cmap.domnode.offsetWidth);
  
  this.cmenode.style.width=""+new_w + 'px';
  this.cmenode.style.background='-webkit-gradient(linear, left center, right center, from(rgba('+cs+')), to(rgba('+ce+')))';
  this.cmenode.style.background='-moz-linear-gradient(left,  rgba('+cs+'),rgba('+ce+'))';
  
}


colormap_element.prototype.display = function(){

    if(this.prev==null){
	console.log("No display first");
	return;
    }

    this.cmenode=document.createElement('li');

    this.cmenode.style.height='30px'; 
    this.cmenode.style.border='none';

    this.update_colors();	


//    document.styleSheets[0].insertRule('#elid:hover { border: 1px solid red; }', 0);
    //console.log("drawing frac = "+ this.frac + " width = " + this.cmap.domnode.style.width + " this with ="+this.cmenode.style.width);
    
    this.cmap.domnode.appendChild(this.cmenode);
    
    var ceci=this;

    if(this.prev!=null && this.next!=null)
	this.display_division();

    
    this.cmenode.onmousedown = function(e) {

	if(ceci.selected_element != null){
	  //  ceci.selected_element.cmenode.style.border='none';	    
	  //  ceci.selected_element.cmenode.style.width= (ceci.selected_element.cmenode.style.width+4.0)+'px';
	}

	//ceci.cmenode.style.border='2px solid orange';
	//ceci.cmenode.style.width= (ceci.cmenode.style.width-4.0)+'px';

	ceci.cmap.select_element(ceci);
    }


    
    
}


colormap_element.prototype.display_division = function(){

//    this.handlenode=document.createElement('div');
    this.handlenode=document.createElement('li');
    

//    this.handlenode.style.display='inline';
//    this.handlenode.style.float='left';
    this.handlenode.style.width='4px';
    //this.handlenode.style.backgroundColor='rgba(0,0,0,10)';
    this.handlenode.style.height='31px';
    this.handlenode.style.marginLeft='-2px';
    this.handlenode.style.marginRight='-2px';
    this.handlenode.style.marginTop='30px';
    this.handlenode.style.zIndex='3';


    this.handlenode.className='color_handle';
    
    
//    this.cmap.domnode.appendChild(this.handlenode);
    this.cmap.domnode.appendChild(this.handlenode);
    
    var ceci=this;
    
    this.handlenode.onmousedown = function(e) {

	if(!ceci.cmap.mousemove){
	    
	    //console.log("Mousedown " + ceci.frac);
	    
	    //this.cmap.lastsize=this.frac;//parseInt(ceci.cmenode.style.width,10);
	    ceci.cmap.lastfrac=ceci.frac;
	    ceci.cmap.mousexstart= get_mouse_pos(e)[0];
	    ceci.cmap.mousemove=1;
	    ceci.cmap.mouse_object=ceci;
	}
	
	//console.log("mousedown! "+ e.clientX);
	
    }
    
}

colormap_element.prototype.hex_color = function(e) {
    return rgb2hex(Math.floor( (this.color[0]*255)), Math.floor( (this.color[1]*255)), Math.floor( (this.color[2]*255)) );
}

colormap_element.prototype.set_hex_color = function(color){

    rbgc=hex2rgb(color); //color.toRgb();
    
    this.color[0]=rbgc.r/255.0;
    this.color[1]=rbgc.g/255.0;
    this.color[2]=rbgc.b/255.0;
    //	this.start_color[3]=rbgc.a/255.0;	
    
    this.update_colors();
    if(this.next) 
	this.next.update_colors();
}


colormap_element.prototype.update_color_selection = function(e) {

    if(this.prev==null){
	console.log("No prev element!");
	return;
    }

    this.cmap.start_color.value=this.prev.hex_color();
    this.cmap.end_color.value=this.hex_color();

    this.cmap.start_range.value=this.prev.frac;
    this.cmap.end_range.value=this.frac;
    

/*
    
    $("input[type=color]").spectrum({
					preferredFormat: "hex6",
					className :"basic_color_picker"
				    });
    
*/


//    $("#start_color").val(this.prev.hex_color());
    // $("#end_color").val(this.hex_color());
    // $("#start_range").val(this.prev.frac);
    // $("#end_range").val(this.frac);
    
}

function get_mouse_pos(e){
    
    var pos = [0,0];

    if (!e) var e = window.event;
    if (e.pageX || e.pageY) {
	
	pos[0] = e.pageX;
	pos[1] = e.pageY;
    }
    else if (e.clientX || e.clientY) {
	
	pos[0] = e.clientX + document.body.scrollLeft
	    + document.documentElement.scrollLeft;
	pos[1] = e.clientY + document.body.scrollTop
	    + document.documentElement.scrollTop;
    }
    return pos;
}



colormap_element.prototype.update_mouse = function(e){

    var mousedx=get_mouse_pos(e)[0]-this.cmap.mousexstart;
    var W=parseInt(this.cmap.domnode.style.width,10);

    //console.log("lastfrac="+this.cmap.lastfrac + " mousedx=" + mousedx + " W=" + W);

    this.frac=this.cmap.lastfrac+mousedx/W; 

    this.cmap.end_range.value=this.frac;

    this.update_colors();
    this.next.update_colors();

    //console.log("mousemove DX="+ mousedx + " csize="+csize) ;	
}

colormap.prototype.mouse_done = function(e){

    //console.log("Mouse done ...");
    if(this.mouse_object!=null){
	//console.log("Mouse done ..." + this.mouse_object.debug() );
	this.mouse_object.update_mouse(e);
	this.mousemove=0;
	this.mouse_object=null;
	
	this.update_callback();

    }
    
}



colormap_element.prototype.split=function(){
    if(this.prev==null) return;
    
    var nfrac=.5*(this.frac+this.prev.frac);
    var ncol=[];
    for(var c=0;c<4;c++) ncol[c]=.5*(this.prev.color[c]+this.color[c]);
    
    this.insert_color(ncol,nfrac );
    
}
