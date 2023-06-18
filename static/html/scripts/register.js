$(function() {
    $("#registerBtn").click(function() {
        let login = $("#login").val();
        let password = $("#password").val();
        $.ajax({
            crossDomain: true,
            responseType: "application/json",
            url: `${cfg.HOST}${cfg.PORT}${cfg.REGISTER_PATH}?login=${login}&password=${password}&token=${localStorage.getItem("token")}`,
            type: "POST"
        })
        .done(function(resp) {
            const data = JSON.parse(resp);
            if (data.status == "OK") {
              alert(data.message);
            } else {
              alert(data.error);
            }
        })
        .fail(function() {
          $(".error").load("../components/error.html");
        });
    });
});
