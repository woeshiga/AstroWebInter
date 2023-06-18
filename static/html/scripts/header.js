$(function(){
    if (!localStorage.getItem("token")){
        $("header").load("../components/header.html");
    }
    else
    {
        $.ajax({
            url: `${cfg.HOST}${cfg.PORT}${cfg.GET_USER_PATH}?token=${localStorage.getItem("token")}`,
            headers: {
                "Access-Token": localStorage.getItem("token"),
            },
            type: "GET",
            responseType: "application/json"
        })
        .done(function(resp) {
          const data = JSON.parse(resp);
            if (data.status != "OK")
            {
                localStorage.removeItem("token");
                window.location.reload()
            }
            else
            {
                $("header").load("../components/header_user.html");
            }
        })
        .fail(function() {
          $(".error").load("../components/error.html");
        });
    }
});
