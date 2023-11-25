const NodeHelper = require("node_helper");
const https = require('https');
const HTMLParser = require('node-html-parser');

function processData(data, timeFormat, directions) {
  let result = [];

  if (data) {
    const root = HTMLParser.parse(data);
    if (root) {
      const mainElement = root.getElementsByTagName('main')[0];
      const tables = mainElement.getElementsByTagName('table');
      for (table of tables) {
        const caption = table.getElementsByTagName('caption')[0];
        if (caption.innerText.includes('Services departing ')) {
          const tbody = table.getElementsByTagName('tbody')[0];
          const rows = tbody.getElementsByTagName('tr');
          rows.forEach(row => {
            const tds = row.getElementsByTagName('td');
            const details = tds[1].getElementsByTagName('div')[1].getElementsByTagName('div')[0];
            let destination = details.getElementsByTagName('a')[0].innerText;
            destination = destination.substr(0, destination.indexOf(' train'));
            const direction = details.getElementsByTagName('span')[0].innerText;
            if (((direction == 'Downward') && directions.includes('Downward')) ||
                ((direction == 'Upward') && directions.includes('Upward'))) {
              let scheduled = tds[2].getElementsByTagName('div')[0].getElementsByTagName('span')[0].innerText.split(' ');
              const ampm = scheduled[1];
              if (timeFormat == 24) {
                let hour = parseInt(scheduled[0].split(':')[0], 10);
                if ((ampm == "PM") && (hour != 12)) hour += 12;
                const minutes = scheduled[0].split(':')[1];
                scheduled = hour.toString() + ':' + minutes;
              } else {
                scheduled = scheduled[0] + ' ' + scheduled[1];
              }
              const departing = tds[3].getElementsByTagName('div')[0].getElementsByTagName('span')[0].getElementsByTagName('div')[0].innerText;
              result.push({
                destination,
                scheduled,
                departing,
              });
            }
          });
        }
      }
    }
  }

  return result;
}

module.exports = NodeHelper.create({
  start: function() {
    console.log("Starting node helper: " + this.name);
  },
  
  socketNotificationReceived: function(notification, payload) {
    var self = this;
    console.log("Notification: " + notification + " Payload: " + JSON.stringify(payload));

    if (notification === "GET_DATA") {
      const url = 'https://jp.translink.com.au/plan-your-journey/stops/' + payload.config.station.toLowerCase() + '-station';

      const req = https.get(url, res => {
        let body = '';

        res.on('data', chunk => {
          body += chunk;
        });

        res.on('end', () => {
          try {
            const result = processData(body, payload.config.timeFormat, payload.config.directions);
            self.sendSocketNotification("GOT_DATA", { payload: result });
          } catch (error) {
            console.error(error.message);
          }
        });
      });

      req.on('error', (e) => {
        console.error(e);
      });
      req.end();
    }
  }
});
