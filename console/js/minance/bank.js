function resetInput() {
  let field = document.getElementById("bankForm");
  field.value = field.defaultValue;
}

$(document).ready(function (e) {
  let dt = dynamicTable.config("data-table", ["bankId", "bankName"], ["Bank Id", "Bank Name"], //set to null for field names
      // instead of custom header names
      "There are no banks to list...");
  getAllData("bank").then((data) => dt.load(data));

  $("#createBank").on("click", function (event) {
    event.preventDefault();

    let bankName = $("#bankForm").val();
    let body = {
      bankName: bankName,
    };
    callApi("/1.0/minance/bank/create", "POST", body)
        .then((response) => {
          $("#msgBox").text(bankName + " Created!");
          $("#bankForm").trigger("reset");
          getAllData("bank").then((data) => dt.load(data));
        })
        .catch((error) => {
          alert(error);
        });
    resetInput();
  });

  $("#deleteBank").on("click", function (event) {
    event.preventDefault();

    let bankName = $("#bankForm").val();
    callApi("/1.0/minance/bank/delete/" + bankName, "DELETE").then((response) => {
      $("#msgBox").text(bankName + " Deleted!");
      $("#bankForm").trigger("reset");
      getAllData("bank").then((data) => dt.load(data));
    });
    resetInput();
  });
});
