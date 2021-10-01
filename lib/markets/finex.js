var request = require('postman-request');
var base_url = 'https://xapi.finexbox.com/v1';

function get_summary(coin, exchange, cb) {
  var req_url = base_url + '/ticker?market=' + coin + '_' + exchange;

  request({uri: req_url, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
    if (error)
      return cb(error, null);
    else {
      if (body.message)
        return cb(body.message, null);
      else {
        var retVal = {
          'volume': body.result.Volume,
          'high': body.result.High,
          'low': body.result.Low,
          'price': body.result.Price,
          'average': body.result.Average
        };

        return cb (null, retVal);
      }
    }
  });
}

function get_trades(coin, exchange, cb) {
  var req_url = base_url + '/history?market=' + coin + '_' + exchange + '&count=50';

  request({uri: req_url, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
    if (body.success) {
      var trades = [];

      if (body.result.length > 0) {
          for (var i = 0; i < body.result.length; i++) {
            var trade = {
              type: body.result[i]['OrderType'],
              price: body.result[i]['Price'],
              amount: body.result[i]['Quantity'],
              total: body.result[i]['Total'],
              timestamp: parseInt(new Date(body.result[i]['TimeStamp']).getTime()/1000)
            };

            trades.push(trade);
          }
      }

      return cb(null, trades);
    } else
      return cb(body.message, null);
  });
}

function get_orders(coin, exchange, cb) {
  var req_url = base_url + '/orders?market=' + coin + '_' + exchange + '&count=25';

  request({uri: req_url, json: true, headers: {'User-Agent': 'eiquidus'}}, function (error, response, body) {
    if (body.success) {
      var orders = body.result;
      var buys = [];
      var sells = [];

      if (orders['buy'].length > 0) {
        for (var i = 0; i < orders['buy'].length; i++) {
          var order = {
            price: orders.buy[i].Rate,
            quantity: orders.buy[i].Quantity
          };

          buys.push(order);
        }
      }

      if (orders['sell'].length > 0) {
        for (var i = 0; i < orders['sell'].length; i++) {
          var order = {
            price: orders.sell[i].Rate,
            quantity: orders.sell[i].Quantity
          };

          sells.push(order);
        }
      }

      return cb(null, buys, sells);
    } else
      return cb(body.message, [], []);
  });
}

function get_chartdata(coin, exchange, cb) {
  var end = Date.now();

  end = end / 1000;
  start = end - 86400;

  var req_url = base_url + '/chart?market=' + coin + '_' + exchange + '&period=60';

  request({ uri: req_url, json: true, headers: {'User-Agent': 'eiquidus'} }, function (error, response, chartdata) {
    if (error)
      return cb(error, []);
    else {
      if (chartdata.success) {
        var processed = [];

        for (var i = 0; i < chartdata.result.length; i++) {
          // only take values more recent than the last 24 hours
          if (new Date(chartdata.result[i].TimeStamp).getTime()/1000 > start)
            processed.push([new Date(chartdata.result[i].TimeStamp).getTime(), parseFloat(chartdata.result[i].Open), parseFloat(chartdata.result[i].High), parseFloat(chartdata.result[i].Low), parseFloat(chartdata.result[i].Close)]);
        }

        return cb(null, processed);
      } else
        return cb(chartdata.message, []);
    }
  });
}

module.exports = {
  market_name: 'FinexBox',
  market_logo: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAEKADAAQAAAABAAAAEAAAAAA0VXHyAAABgklEQVQ4EaWSS0/CQBSFz0zbtFrlISQSdOMGE5cuXLhx5Y/wD7sgJi50gUEjC4lRUVFAnjPjvVNLG8AE9G6mTXu+c85txf7JmcE/Rv5JaxJPdymA1oAmEQulhPE9YKIgSPw7gE2UAr+lwwCqmIXazkEVMvDqTXh3jxa2GKA0jBCY7BYxruxAlQswBGFn77oRiek5zzyAoqnMOkZHFYz3SoDnQtjOAvK5jaB6Q/eklIsA5KxyIfqnhxQ5AzGa2K6chvv7l7cQnb6FWnvmxBd8alrQ4PgAamsDst21SxIsdiS5v8O9f4JwnbQkBeDo5TxUKQ+HomLNp4IODEcdjuBf1CE50U/3mJIkoIg6G0K2PmE2Q7swQ84gkX9eg/vQssBYGJ/JEoks2z0YcjaBB9EbQL58wL9qwGm+QjBswSQA6s8TVGsQgzHE1xCySwujxc72TnMiAMcnV0muzlsn6sndBUFnlpYW8/U0AS/LOtJ3X2Wi3NyfY/P/vuJMN0OB5z7RMqxvCTKGvxT6xh0AAAAASUVORK5CYII=',
  get_data: function(settings, cb) {
    var error = null;
    get_chartdata(settings.coin, settings.exchange, function (err, chartdata) {
      if (err) { chartdata = []; error = err; }
      get_orders(settings.coin, settings.exchange, function(err, buys, sells) {
        if (err) { error = err; }
        get_trades(settings.coin, settings.exchange, function(err, trades) {
          if (err) { error = err; }
          get_summary(settings.coin, settings.exchange, function(err, stats) {
            if (err) { error = err; }
            return cb(error, {buys: buys, sells: sells, chartdata: chartdata, trades: trades, stats: stats});
          });
        });
      });
    });
  }
};
