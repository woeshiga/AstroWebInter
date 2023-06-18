$(function() {
  $.ajax({
      url: `${cfg.HOST}${cfg.PORT}${cfg.GET_USER_PATH}?token=${localStorage.getItem("token")}`,
      headers: {
          "Access-Control-Request-Method": "GET",
      },
      type: "GET",
      responseType: "application/json",
      xhrFields: {
        withCredentials: true
    },
    crossDomain: true
  })
  .done(function(resp) {
      const data = JSON.parse(resp);
      if (data.status != "OK")
      {
          localStorage.removeItem("token");
          window.location.replace("/login");
      }
  })
  .fail(function() {
    $(".error").load("../components/error.html");
  });
})
