function LinkedList() {
    this.length= 0;
    this.first= null;
    this.last= null;
}


 LinkedList.Node = function(data) {
    
   this.prev = null; this.next = null;
   this.data = data;
 };


LinkedList.dlink = function() {
};

LinkedList.dlink.prototype = new LinkedList();

LinkedList.dlink.prototype.append = function(node) {
    
    if (this.first === null) {
	
	node.prev = null;
	node.next = null;
	this.first = node;
	this.last = node;
    } else {
	
	node.prev = this.last;
	node.next = null;

	this.last.next = node;
	this.last = node;
    }

    this.length++;
};

LinkedList.dlink.prototype.insertAfter = function(node, newNode) {
    
    newNode.prev = node;
    newNode.next = node.next;

    node.next.prev = newNode;
    node.next = newNode;
    if (newNode.prev == this.last) {
	this.last = newNode; }
    this.length++;
};

LinkedList.dlink.prototype.remove = function(node) {
    
  if (this.length > 1) {
      
    node.prev.next = node.next;
    node.next.prev = node.prev;
    if (node == this.first) {
	 this.first = node.next; }
    if (node == this.last) {
	 this.last = node.prev; }
  } else {
      
    this.first = null;
    this.last = null;
  }
  node.prev = null;
  node.next = null;
  this.length--;
};


