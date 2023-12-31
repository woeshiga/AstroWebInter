
// Array Remove 

Array.prototype.remove = function(from, to) {
    var rest = this.slice((to || from) + 1 || this.length);
    this.length = from < 0 ? this.length + from : from;
    return this.push.apply(this, rest);
};

Array.prototype.compare = function (array) {
    // if the other array is a falsy value, return
    if (!array)
        return false;

    // compare lengths - can save a lot of time
    if (this.length != array.length)
        return false;

    for (var i = 0; i < this.length; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!this[i].compare(array[i]))
                return false;
        }
        else if (this[i] != array[i]) {
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;
        }
    }
    return true;
}

var server_prefix="";

/*
Object.prototype.getName = function() { 
    var funcNameRegex = /function (.{1,})\(/;
    var results = (funcNameRegex).exec((this).constructor.toString());
    return (results && results.length > 1) ? results[1] : "";
};
*/

var nameFromToStringRegex = /^function\s?([^\s(]*)/;

/**
 * Gets the classname of an object or function if it can.  Otherwise returns the provided default.
 *
 * Getting the name of a function is not a standard feature, so while this will work in many
 * cases, it should not be relied upon except for informational messages (e.g. logging and Error
 * messages).
 *
 * @private
 */

function class_name(object, defaultName) {
    var result = "";
    if (typeof object === 'function') {
        result = object.name || object.toString().match(nameFromToStringRegex)[1];
    } else if (typeof object.constructor === 'function') {
        result = class_name(object.constructor, defaultName);
    }
    return result || defaultName;
}

//Adding class setting helpers to all dom objects

HTMLElement.prototype.remove_class = function(class_name) {
    this.className =this.className.replace(new RegExp("(?:^|\\s)"+class_name+"(?!\\S)","g"), '' );
};

HTMLElement.prototype.add_class = function(class_name) {
    this.className +=' '+class_name;
};

HTMLElement.prototype.prependChild = function(child) { this.insertBefore(child, this.firstChild); };

function insertAfter(referenceNode, newNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

function create_std_button(button_name, callback){
    var b=document.createElement('button'); b.className="std_button";b.innerHTML=button_name;
    b.addEventListener("click", function(ev){
	callback(ev,b);
    });
    return b;
}



//Make a "true" copy of an object as the = in js returns only a reference (pointer).
//This is stupid?

function clone_obj(o) {
    
    var new_obj = (o instanceof Array) ? [] : {};

    for (i in o) {
	if (i == 'clone') continue; //?
	if (o[i] && typeof o[i] == "object") {
	    new_obj[i] = clone_obj(o[i]);//.hyperclone();
	} else 
	    new_obj[i] = o[i];
    } 

    return new_obj;
}

//Display JSON avoiding the circular objects.

function jstringify(object, n){ 
    
    //console.log('JS' );
    
    var cache=[];
    var nn=5;
    if(n) nn=n;
    
    return JSON.stringify(object,function(key, value) {
	if (typeof value === 'object' && value !== null) {
	    if (cache.indexOf(value) !== -1) {
		// Circular reference found, discard key
		return;
	    }
	    // Store value in our collection
	    cache.push(value);
	}
	//console.log('JS END' );
	return value;
    } , nn );
    
    
    cache = null; // Enable garbage collection
}

function capitalise_first_letter(string){
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function is_ascii(str) {
    return /^[\x00-\x7F]*$/.test(str);
}


function download_url(url, callback) {
    var request = new XMLHttpRequest;  //We don't want to support IE*
    // window.ActiveXObject ? 
    // new ActiveXObject('Microsoft.XMLHTTP') : 
    
    request.open('GET', url, true);
    
    request.onreadystatechange = function() {
        if (request.readyState == 4 && request.status==200) {
	    if(callback)
		callback(request.responseText);
        }else{
	    //console.log("URL download failed for " + url + " status="+request.status + " ready state=" + request.readyState);
	    //if(callback)
	    //console.log("DOWNLOAD status=" + request.status + ' ready ='+request.readyState);
	}
    };
    
    try{
	request.send(null);
    }
    catch (e){
	if(callback)
	    callback("Send ERROR " + e);
    }
}

// function download_url_sync(url) {
//     var request = new XMLHttpRequest;  //We don't want to support IE*
//     // window.ActiveXObject ? 
//     // new ActiveXObject('Microsoft.XMLHTTP') : 

//     request.open('GET', url, false);
//     request.send(null);
               
//     if (request.readyState == 4 && request.status==200) {
//         return request.responseText;
//     }
//     return request.statusText;
// }

function create_action_menu(base_node){
    
    menu_node=document.createElement("ul");
    menu_node.className="action_list";
    base_node.appendChild(menu_node);
    
    menu_node.create_action = function ( action_name, click_callback){
	action_node=document.createElement("li");
	a_node=document.createElement("a");
	//	a_node.className="action";
	a_node.innerHTML=action_name;
	a_node.onclick=click_callback;
	this.appendChild(action_node);
	action_node.appendChild(a_node);
	return a_node;
    }
    return menu_node;
}




//Returns the current server address

var hostname="";

function get_server_address(){
    if(hostname=="")hostname=location.host;

    if(document.location.protocol == "http:")
	return "http://"+hostname+"/"+server_prefix;
    else
	return "https://"+hostname+"/"+server_prefix;
}

// This function loads the javascript file located at script_src url. After successful loading of the script,
// the ready_function callback is triggered.

function require_javascript(script_src, ready_function){

    var head = document.getElementsByTagName('head')[0];
    var scripts = head.getElementsByTagName('script');
    
    for(var s=0;s<scripts.length;s++)
	if(scripts[s].src == script_src){ //The script  is already loaded
	    ready_function(null,{});
	    return;
	}
    
   // console.log("Script "+ script_src + " not found, loading...") ;
	
    new_script = document.createElement('script');
    new_script.type = 'text/javascript';
    new_script.charset = 'utf-8';
    new_script.src = script_src;
    new_script.onload = function() {
	ready_function(null,{});
    }
    
    document.getElementsByTagName('head')[0].appendChild(new_script);
    
}


// This function loads the javascript file located at the main server's script_path path. After successful loading of the script,
// the ready_function callback will be called.


function require_our_javascript(script_path, ready_function){

    var script_src=get_server_address()+script_path;

    // console.log('script url is ' + script_src);

    // if(document.location.protocol == "http:")
    // 	script_src ="http://"+location.host+"/"+script_path;
    // else
    // 	script_src ="https://"+location.host+"/"+script_path;
    
    require_javascript(script_src, ready_function);

}


// This function loads the javascript file corresponding to a widget given by its widget_name. After successful loading of the script,
// the ready_function callback will be called.
//
// To avoid loading useless widget javascript code in the browser, this function should be called each time
// a new widget type is used.


function require_widget(widget_name, ready_function){
    //console.log("require widget " + widget_name);
    var script_path = "/js/widgets/" + widget_name + ".js";
    require_our_javascript(script_path, function(){
	

	eval(widget_name).prototype.widget_name=widget_name;
	//console.log("Updating prototype for " + widget_name + " done WN = " + eval(widget_name).prototype.widget_name );
	ready_function();
    });    
}

/*
window.addEventListener("message", receiveMessage, false);
function receiveMessage(event){
    console.log("Received WIN EVENT : " + JSON.stringify(event.data));
    // if (event.origin !== "http://example.org:8080")
    //     return;
    event.source.postMessage("Yes i got it....", event.origin);
}

window.transfer_widget = function( w){
    console.log("Transfert ! "+ w);
}
*/

var dump_error =function (err) {
    var rs="";
    if (typeof err === 'object') {
	if (err.message) {
	    rs='\nMessage: ' + err.message;
	}
	if (err.stack) {
	    rs+='\nStacktrace:';
	    rs+='====================';
	    rs+=err.stack;
	}
    } else {
	rs= err;
    }
    return rs;
}
