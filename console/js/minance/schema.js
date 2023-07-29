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
  var isCompatible = false;
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
    var data = null;
    var file = evt.target.files[0];
    var reader = new FileReader();
    reader.readAsText(file);
    reader.onload = function (event) {
      var csvData = event.target.result;
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

function uploadSchemaTable(dt, bankName, accountName) {
  callApi(
    "http://localhost:8080/1.0/minance/csvschema/retrieve/" +
      bankName +
      "/" +
      accountName,
    "GET"
  )
    .then((response) => {
      if (response.ok) {
        return response.json();
      } else {
        return null;
      }
    })
    .then((data) => {
      let unpackedData = [];
      if (data == null) {
        return;
      }
      data.columnMapping.forEach((d) => {
        const item = new Object();
        item["accountId"] = data.accountId;
        item["accountName"] = accountName;
        item["bankName"] = bankName;
        item["inputColumn"] = d["inputColumn"];
        item["transactionColumn"] = d["transactionColumn"];
        unpackedData.push(item);
      });
      dt.load(unpackedData);
    })
    .catch((error) => {
      alert(error);
    });
}

$(document).ready(function (e) {
  // upload csv
  document
    .getElementById("txtFileUpload")
    .addEventListener("change", upload, false);
  var tempAccountId;
  // find all the banks for the banks select
  getAllData("bank").then((data) => {
    if (data.length == 0) {
      return;
    }
    tempAccountId = new Object();
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

  // find all the accounts given the bank selected

  $("#bankSelect").on("change", function () {
    getAllData("account").then((data) => {
      if (data.length == 0) {
        return;
      }
      let options = "<option selected>Select Account</option>";
      data.forEach((item) => {
        if (item.bankName == $("#bankSelect").val()) {
          tempAccountId[item.accountName] = item.accountId;
          options +=
            '<option value="' +
            item.accountName +
            '">' +
            item.accountName +
            "</option>";
        }
      });
      $("#accountSelect").html(options);
    });
  });

  let dt = dynamicTable.config(
    "data-table",
    [
      "accountId",
      "accountName",
      "bankName",
      "inputColumn",
      "transactionColumn",
    ],
    [
      "Account Id",
      "Account Name",
      "Bank Name",
      "Input Column",
      "Transaction Column",
    ], //set to null for field names instead of custom header names
    "There are no header mapping to list..."
  );

  $("#accountSelect").on("change", function () {
    let bankName = $("#bankSelect").val();
    let accountName = $("#accountSelect").val();
    if (bankName == "" || accountName == "") {
      return;
    }
    uploadSchemaTable(dt, bankName, accountName);
  });

  $("#createSchema").on("click", function (event) {
    event.preventDefault();
    let bankName = $("#bankSelect").val();
    let accountName = $("#accountSelect").val();
    if (!tempAccountId.hasOwnProperty(accountName)) {
      alert("Must select bank and account before creating schema!");
    }
    let accountId = tempAccountId[accountName];
    let body = {
      accountId: accountId,
      dateFormat: $("#dateFormat").val(),
      columnMapping: [
        {
          inputColumn: $("#category").val(),
          transactionColumn: "category",
        },
        {
          inputColumn: $("#description").val(),
          transactionColumn: "description",
        },
        {
          inputColumn: $("#transactionType").val(),
          transactionColumn: "transactionType",
        },
        {
          inputColumn: $("#description").val(),
          transactionColumn: "description",
        },
        {
          inputColumn: $("#transactionDate").val(),
          transactionColumn: "transactionDate",
        },
        {
          inputColumn: $("#postDate").val(),
          transactionColumn: "postDate",
        },
        {
          inputColumn: $("#amount").val(),
          transactionColumn: "amount",
        },
        {
            inputColumn: $("#memo").val(),
            transactionColumn: "memo",
          },
      ],
    };
    callApi("http://localhost:8080/1.0/minance/csvschema/create", "POST", body)
      .then((response) => {
        if (response.ok) {
          $("#msgBox").text("CSV Schema Created!");
        }
        uploadSchemaTable(dt, bankName, accountName);
        tempAccountId = new Object();
      })
      .catch((error) => {
        alert(error);
      });
  });

  $("#deleteSchema").on("click", function (event) {
    event.preventDefault();
    let bankName = $("#bankSelect").val();
    let accountName = $("#accountSelect").val();
    let accountId = $("#deleteSchemaForm").val();

    callApi(
      "http://localhost:8080/1.0/minance/csvschema/delete/" + accountId,
      "DELETE"
    ).then((response) => {
      if (response.ok) {
        $("#msgBox").text("Schema Deleted!");
      }
      location.reload()
    });
  });
});
