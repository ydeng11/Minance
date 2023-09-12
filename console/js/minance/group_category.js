$(document).ready(function () {
  getAllData("mapping_category/unlinkedCategories").then((data) => {
    if (data == null || data.length == 0) {
      return;
    }
    let options = "<option selected>Select Transaction Categories</option>";
    data.forEach((item) => (options += '<option value="'
        + item.name
        + '">'
        + item.name
        + "</option>"));
    $("#rawCategory").html(options);
  });

  getAllData("mapping_category/minanceCategory").then((data) => {
    if (data == null || data.length == 0) {
      return;
    }
    let options = "<option selected>Select Minance Category</option>";
    data.forEach((item) => (options += '<option value="'
        + item.category
        + '">'
        + item.category
        + "</option>"));
    $("#minanceCategory").html(options);
  });

  $("#linkCategory").on("click", function (event) {
    event.preventDefault();
    let listRawCategories = $("#rawCategory").val();
    let minanceCategory = $("#minanceCategory").val();
    let body = {
      minanceCategory: minanceCategory, listRawCategories: listRawCategories
    };
    callApi("/1.0/minance/mapping_category/linkCategory", "POST", body)
        .then((response) => {
          if (response.ok) {
            $("#msgBox").text(response.body);
          }
          $("#rawCategory").trigger("reset");
        })
        .catch((error) => {
          alert(error);
        });
  });

  $("#createMinanceCategory").on("click", function (event) {
    event.preventDefault();
    let minanceCategory = $("#minanceCategoryForm").val();
    let body = {
      "category": minanceCategory,
    };
    callApi("/1.0/minance/mapping_category/create", "POST", body)
        .then((response) => {
          if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
          }
          return response.text();
        })
        .then((responseText) => {
          $("#msgBox").text(responseText)
        })
        .catch((error) => {
          alert(error);
        });
  });

  $("#deleteMinanceCategory").on("click", function (event) {
    event.preventDefault();
    let minanceCategory = $("#minanceCategoryForm").val();
    let body = {
      "category": minanceCategory,
    };
    callApi("/1.0/minance/mapping_category/delete", "DELETE", body)
        .then((response) => {
          if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
          }
          return response.text();
        }).then((responseText) => {
      $("#msgBox").text(responseText)
    })
        .catch((error) => {
          alert(error);
        });
  });

})
