function resetInput() {
  let field = document.getElementById("accountForm");
  field.value = field.defaultValue;
}

$(document).ready(function (e) {
  // find all the banks for the banks select
  let bankMap;
  getAllData("bank").then((data) => {
    if (data.length == 0) {
      return;
    }
    bankMap = Object.fromEntries(data);
    let options = "<option selected>Select Bank</option>";
    data.forEach(
      (item) =>
        (options +=
          '<option value="' +
          item.bankName +
          '">' +
          item.bankName +
          "</option>")
    );
    $("#bankSelect").html(options);
  });

  let dt = dynamicTable.config(
    "data-table",
    ["accountId", "accountName", "accountType", "bankName", "initBalance"],
    ["Account Id", "Account Name", "Account Type", "Bank Name", "Init Balance"], //set to null for field names instead of custom header names
    "There are no banks to list..."
  );

  getAllData("account").then((data) => dt.load(data));

  $("#createAccount").on("click", function (event) {
    event.preventDefault();
    let bankName = $("#bankSelect").val();
    let accountName = $("#accountForm").val();
    let accountType = $("#accountTypeSelect").val();
    let initBalance = $("#initBalance").val();
    let body = {
      bankName: bankName,
      accountName: accountName,
      accountType: accountType,
      initBalance: initBalance,
    };
    callApi("http://localhost:8080/1.0/minance/account/create", "POST", body)
      .then((response) => {
        if (response.ok) {
            $("#msgBox").text(accountName + " Created!");
        }
        $("#accountForm").trigger("reset");
        getAllData("account").then((data) => dt.load(data));
      })
      .catch((error) => {
        alert(error);
      });
    resetInput();
  });

  $("#deleteAccount").on("click", function (event) {
    event.preventDefault();

    let bankName = $("#bankSelect").val();
    let accountName = $("#accountForm").val();

    callApi(
      "http://localhost:8080/1.0/minance/account/delete/" +
        bankName +
        "/" +
        accountName,
      "DELETE"
    ).then((response) => {
        if (response.ok) {
            $("#msgBox").text(accountName + " Deleted!");
        }
      $("#bankForm").trigger("reset");
      getAllData("account").then((data) => dt.load(data));
    });
    resetInput();
  });
});
