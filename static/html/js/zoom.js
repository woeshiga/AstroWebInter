$(document).ready(function(){
  $('.hover_image').mousemove(function(e){
    // положение элемента
    var pos = $(this).offset();
    var elem_left = pos.left;
    var elem_top = pos.top;

    var width = $(this).width();
    var height = $(this).height();

    // положение курсора внутри элемента
    var Xinner = e.pageX - elem_left;
    var Yinner = e.pageY - elem_top;
    //console.log("X: " + Xinner + " Y: " + Yinner); // вывод результата в консоль
    //console.log((Xinner / width * 100).toString() + '% ' + (Yinner / height * 100).toString() + '%'); // вывод результата в консоль
    $('.zoom-image').css('display', 'block');
    /*$('.zoom-image').css('width', '500px');
    $('.zoom-image').css('height', '500px');*/
    $('.zoom-image').css('opacity', '1');
    $('.zoom-image').css('background-position', (Xinner / width * 100).toString() + '% ' + (Yinner / height * 100).toString() + '%');
  });
  $('.hover_image').mouseleave(function() {
    /*$('.zoom-image').css('width', '0px');
    $('.zoom-image').css('height', '0px');*/
    $('.zoom-image').css('opacity', '0');
    $('.zoom-image').css('display', 'none');
  });
});