$(function() {
    $("#logout").click(function() {
        $.ajax({
            crossDomain: true,
            responseType: "application/json",
            url: `${cfg.HOST}${cfg.PORT}${cfg.LOGOUT_PATH}?token=${localStorage.getItem("token")}`
        })
        .done(function() {
            localStorage.clear();
            window.location.replace("/");
        })
        .fail(function() {
          $(".error").load("../components/error.html");
        });
    });
});
