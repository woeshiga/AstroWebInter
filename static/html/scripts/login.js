$(function() {
    $("#loginBtn").click(function() {
        let login = $("#login").val();
        let password = $("#password").val();
        $.ajax({
            crossDomain: true,
            responseType: "application/json",
            url: `${cfg.HOST}${cfg.PORT}${cfg.LOGIN_PATH}?login=${login}&password=${password}`,
            type: "POST",
            xhrFields: {
              withCredentials: true
          },
        })
        .done(function(resp) {
            const data = JSON.parse(resp);
            if (data.status == "OK") {
              localStorage.clear()
              localStorage.setItem("login", data.data.login);
              localStorage.setItem("token", data.data.token);
              localStorage.setItem("status", data.data.status);
              window.location.replace("/");
            } else {
              alert(data.error);
            }
        })
        .fail(function() {
          $(".error").load("../components/error.html");
        });
    });
});
