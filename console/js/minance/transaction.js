function resetInput() {
  let field = document.getElementById("accountForm");
  field.value = field.defaultValue;
}

function createTable(array) {
  var content = "";
  array.forEach(function (row) {
    content += "<tr>";
    row.forEach(function (cell) {
      content += "<td>" + cell + "</td>";
    });
    content += "</tr>";
  });
  document.getElementById("csv-table").innerHTML = content;
}

// Method that checks that the browser supports the HTML5 File API
function browserSupportFileUpload() {
  let isCompatible = false;
  if (window.File && window.FileReader && window.FileList && window.Blob) {
    isCompatible = true;
  }
  return isCompatible;
}

// Method that reads and processes the selected file
function upload(evt) {
  if (!browserSupportFileUpload()) {
    alert("The File APIs are not fully supported in this browser!");
  } else {
    let data = null;
    let file = evt.target.files[0];
    let reader = new FileReader();
    reader.readAsText(file);
    reader.onload = function (event) {
      let csvData = event.target.result;
      data = $.csv.toArrays(csvData);
      if (data && data.length > 0) {
        createTable(data);
      } else {
        alert("No data to import!");
      }
    };
    reader.onerror = function () {
      alert("Unable to read " + file.fileName);
    };
  }
}

var csvData;

$(document).ready(function () {
  // upload csv
  document
      .getElementById("txtFileUpload")
      .addEventListener("change", upload, false);

  // find all the banks for the banks select
  getAllData("bank").then((data) => {
    if (data == null || data.length == 0) {
      return;
    }
    let options = "<option selected>Select Bank</option>";
    data.forEach((item) => (options += '<option value="'
        + item.bankName
        + '">'
        + item.bankName
        + "</option>"));
    $("#bankSelect").html(options);
  });

  // find all the accounts given the bank selected
  let accountMap;
  $("#bankSelect").on("change", function () {
    getAllData("account").then((data) => {
      if (data == null || data.length == 0) {
        return;
      }
      accountMap = Object.fromEntries(data);
      let options = "<option selected>Select Account</option>";
      data.forEach((item) => {
        if (item.bankName == $("#bankSelect").val()) {
          options += '<option value="' + item.accountName + '">' + item.accountName + "</option>";
        }
      });
      $("#accountNameSelect").html(options);
    });
  });

  let dt = dynamicTable.config("data-table", ["transactionId", "accountName", "bankName", "category", "description", "transactionType", "transactionDate", "postDate", "amount", "address", "memo", "uploadTime"], ["Transaction Id", "Account Name", "Bank Name", "Category", "Description", "Transaction Type", "Transaction Date", "Post Date", "Amount", "Address", "Memo", "Upload Time"], //set to null for field names instead of custom header names
      "There are no transaction to list...");

  $("#uploadActivities").on("click", function (event) {
    event.preventDefault();
    let bankName = $("#bankSelect").val();
    let accountName = $("#accountNameSelect").val();
    let accountType = $("#accountTypeSelect").val();
    let useMinanceFormat = $("#useMinanceFormat")[0].checked ? 1 : 0;
    let files = document.querySelector("input[type=file]").files;
    if (files == null || files.length == 0) {
      return;
    }
    let body = new FormData();
    body.append("bankName", bankName);
    body.append("accountName", accountName);
    body.append("accountType", accountType);
    body.append("useMinanceFormat", useMinanceFormat);
    body.append("file", files[0]);
    callApiFormData("/1.0/minance/transactions/upload_csv", "POST", body)
        .then((response) => {
          if (response.ok) {
            $("#msgBox").text(response.body);
          }
          callApi("/1.0/minance/transactions/retrieve/"
              + bankName
              + "/"
              + accountName
              + "/"
              + accountType
              + "/y", "GET")
              .then((response) => {
                if (response.ok) {
                  return response.json();
                }
              })
              .then((data) => dt.load(data));
        })
        .catch((error) => {
          alert(error);
        });
  });

  $("#deleteTransaction").on("click", function (event) {
    event.preventDefault();

    let txnId = $("#transactionIdToDelete").val();

    callApi("/1.0/minance/transactions/delete/" + txnId, "DELETE").then((response) => {
      if (response.ok) {
        $("#msgBox").text(txnId + " Deleted!");
      }
    });
  });

  $("#batchDeleteTransactions").on("click", function (event) {
    event.preventDefault();

    let uploadTime = $("#transactionUploadTime").val();

    callApi("/1.0/minance/transactions/delete/uploadTime/"
        + uploadTime, "DELETE").then((response) => {
      if (response.ok) {
        $("#msgBox").text("Deleted!");
      }
    });
  });

  $("#retrieveRecords").on("click", function (event) {
    event.preventDefault();
    let bankName = $("#bankSelect").val();
    let accountName = $("#accountNameSelect").val();
    let accountType = $("#accountTypeSelect").val();
    let filterDuplicate = $("#filterDuplicate").val();

    callApi("/1.0/minance/transactions/retrieve/"
        + bankName
        + "/"
        + accountName
        + "/"
        + accountType
        + "/"
        + filterDuplicate, "GET")
        .then((response) => {
          if (response.ok) {
            return response.json();
          }
        })
        .then((data) => dt.load(data))
        .catch((error) => {
          alert(error);
        });
  });
});
