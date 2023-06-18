function del(e) {

}

function sets(e) {
  let usr_id = $("#id_status").val();
  let status = $("#status").val();
  // console.log(cfg);
  alert(`${cfg.HOST}${cfg.PORT}${cfg.SET_USER_STATUS_PATH_DEFAULT}?id=${usr_id}&token=${localStorage.getItem("token")}?status=${status}`);
  $.ajax({
    url: `${cfg.HOST}${cfg.PORT}${cfg.SET_USER_STATUS_PATH_DEFAULT}?id=${usr_id}&token=${localStorage.getItem("token")}?status=${status}`,
    type: "UPDATE",
    responseType: "application/json"
  })
  .done(function (resp) {
    const data = JSON.parse(resp);
    if (data.status == "OK") {
      alert(data.message);
      window.location.reload();
    } else {
      alert(data.error);
    }
  })
  .fail(function () {
    alert("Update error!");
  });
});
}
