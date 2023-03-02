const NodeHelper = require("node_helper");
const https = require('https');
const HTMLParser = require('node-html-parser');

function processData(data, timeFormat, directions) {
  let result = [];

  if (data) {
    const root = HTMLParser.parse(data);
    if (root) {
      const stopTimetable = root.getElementById('stop-timetable');
      const tbody = stopTimetable.getElementsByTagName('tbody')[0];
      const rows = tbody.getElementsByTagName('tr');
      rows.forEach(row => {
        const span = row.getElementsByTagName('span')[0];
        const fields = span.innerText.trim().split(',');
        if ((fields[0].includes('Downward') && directions.includes('Downward')) ||
            (fields[0].includes('Upward') && directions.includes('Upward'))) {
          let scheduled = fields[2].split('.')[0].split(' ');
          const ampm = scheduled[4];
          if (timeFormat == 24) {
            let hour = parseInt(scheduled[3].split(':')[0], 10);
            if ((ampm == "PM") && (hour != 12)) hour += 12;
            const minutes = scheduled[3].split(':')[1];
            scheduled = hour.toString() + ':' + minutes;
          } else {
            scheduled = scheduled[3] + ' ' + scheduled[4];
          }
          result.push({
            destination: fields[0].split('Train')[0],
            scheduled: scheduled,
            arriving: fields[1].trim().replace('real-time unavailable', '?'),
          });
        }
      });
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
