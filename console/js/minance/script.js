var dynamicTable = (function () {
  var _tableId, _table, _fields, _headers, _defaultText;

  /** Builds the row with columns from the specified names.
   *  If the item parameter is specified, the memebers of the names array will be used as property
   * names of the item; otherwise they will be directly parsed as text.
   */
  function _buildRowColumns(names, item) {
    var row = "<tr>";
    if (names && names.length > 0) {
      $.each(names, function (index, name) {
        var c = item ? item[name + ""] : name;
        row += "<td>" + c + "</td>";
      });
    }
    row += "</tr>";
    return row;
  }

  /** Builds and sets the headers of the table. */
  function _setHeaders() {
    // if no headers specified, we will use the fields as headers.
    _headers = _headers == null || _headers.length < 1 ? _fields : _headers;
    var h = _buildRowColumns(_headers);
    if (_table.children("thead").length < 1) _table.prepend("<thead></thead>");
    _table.children("thead").html(h);
  }

  function _setNoItemsInfo() {
    if (_table.length < 1) return; //not configured.
    var colspan = _headers != null && _headers.length > 0 ? 'colspan="'
        + _headers.length
        + '"' : "";
    var content = '<tr class="no-items"><td '
        + colspan
        + ' style="text-align:center">'
        + _defaultText
        + "</td></tr>";
    if (_table.children("tbody").length > 0) {
      _table.children("tbody").html(content);
    } else {
      _table.append("<tbody>" + content + "</tbody>");
    }
  }

  function _removeNoItemsInfo() {
    var c = _table.children("tbody").children("tr");
    if (c.length == 1 && c.hasClass("no-items")) _table.children("tbody").empty();
  }

  return {
    /** Configres the dynamic table. */
    config: function (tableId, fields, headers, defaultText) {
      _tableId = tableId;
      _table = $("#" + tableId);
      _fields = fields || null;
      _headers = headers || null;
      _defaultText = defaultText || "No items to list...";
      _setHeaders();
      _setNoItemsInfo();
      return this;
    }, /** Loads the specified data to the table body. */
    load: function (data, append) {
      if (_table.length < 1) return; //not configured.
      _setHeaders();
      _removeNoItemsInfo();
      if (data && data.length > 0) {
        var rows = "";
        $.each(data, function (index, item) {
          rows += _buildRowColumns(_fields, item);
        });
        var mthd = append ? "append" : "html";
        _table.children("tbody")[mthd](rows);
      } else {
        _setNoItemsInfo();
      }
      return this;
    }, /** Clears the table body. */
    clear: function () {
      _setNoItemsInfo();
      return this;
    },
  };
})();

// Example POST method implementation:
async function callApi(url = "", method = "", data = {}) {
  // Default options are marked with *
  const response = await fetch(url, {
    method: method, // *GET, POST, PUT, DELETE, etc.
    mode: "cors", // no-cors, *cors, same-origin
    cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
    credentials: "omit", // include, *same-origin, omit
    headers: {
      accept: 'application/json', "Content-Type": "application/json", // 'Content-Type':
                                                                      // 'application/x-www-form-urlencoded',
    }, redirect: "follow", // manual, *follow, error
    referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin,
                                   // origin-when-cross-origin, same-origin, strict-origin,
                                   // strict-origin-when-cross-origin, unsafe-url
    body: Object.keys(data).length == 0 ? null : JSON.stringify(data), // body data type must match
                                                                       // "Content-Type" header
  });
  return response; // parses JSON response into native JavaScript objects
}


async function callApiFormData(url = "", method = "", data = {}) {
  // Default options are marked with *
  const response = await fetch(url, {
    method: method, // *GET, POST, PUT, DELETE, etc.
    mode: "cors", // no-cors, *cors, same-origin
    cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
    credentials: "omit", // include, *same-origin, omit
    headers: {
      accept: 'application/json',
    }, redirect: "follow", // manual, *follow, error
    referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin,
                                   // origin-when-cross-origin, same-origin, strict-origin,
                                   // strict-origin-when-cross-origin, unsafe-url
    body: data, // body data type must match "Content-Type" header
  });
  return response; // parses JSON response into native JavaScript objects
}

function getAllData(endpoint) {
  return callApi("http://localhost:8080/1.0/minance/" + endpoint + "/retrieveAll", "GET")
      .then((response) => response.json())
      .then((data) => {
        return data;
      })
      .catch((error) => {
        alert(error);
        return {};
      });
}
