Module.register("MMM-TranslinkBrisbane", {

    // Default module config.
    defaults: {
        station : "central",
        updateIntervalSecs: 60,
        maxNumTrains: 5,
        displayDestination: false,
        timeFormat: 24,
        directions: [ 'Downward' ],
    },

    start: function() {
        mtb = this;
        Log.info("Starting module: " + this.name);
        this.traindata = [];
        this.getData();
        
        setInterval(() => {
            mtb.getData(mtb);
        }, mtb.config.updateIntervalSecs * 1000);
    },

    // Define required styles.
    getStyles: function() {
        return [
          this.file('styles.css'),
        ];
    },

    getData: function(mtb = this) {
        Log.info(mtb.name + ": Getting data.");
        mtb.sendSocketNotification("GET_DATA", {
            config: this.config
        });
    },

    traindata: { data: [] },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "GOT_DATA") {
            Log.debug(this.name + ' received data: ' + JSON.stringify(payload));
            this.traindata = { data: payload };
            this.updateDom();
        }
    },

    // Override dom generator.
    getDom: function() {
        var wrapper = document.createElement("div");
        wrapper.setAttribute('class', 'train-timetable');
        wrapper.innerText = this.config.station[0].toUpperCase() + this.config.station.slice(1) + ' trains';
        let table = document.createElement('table');
        table.setAttribute('class', 'train-table');
        let theadrow = document.createElement('tr');
        theadrow.setAttribute('class', 'train-table-header');
        if (this.config.displayDestination) {
          let destination = document.createElement('th');
          destination.innerText = 'Destination';
          theadrow.appendChild(destination);
        }
        let scheduled = document.createElement('th');
        scheduled.innerText = 'Scheduled';
        theadrow.appendChild(scheduled);
        let arriving = document.createElement('th');
        arriving.innerText = 'Arriving';
        theadrow.appendChild(arriving);
        table.appendChild(theadrow);

        if (this.traindata.data.payload) {
          let numRows = 0;
          for (let i = 0;
               (i < this.traindata.data.payload.length) && (numRows < this.config.maxNumTrains);
               i++) {
            const scheduledText = this.traindata.data.payload[i].scheduled;
            const arrivingText = this.traindata.data.payload[i].arriving;
            if (arrivingText.includes('skip')) continue;
            if ((i > 0) &&
                (scheduledText == this.traindata.data.payload[i - 1].scheduled) &&
                (arrivingText == this.traindata.data.payload[i - 1].arriving)) {
              // Duplicate (maybe due to platform changing).
              continue;
            }
            let row = document.createElement('tr');
            let td = document.createElement('td');
            if (this.config.displayDestination) {
              td.setAttribute('class', 'train-destination train-cell');
              td.innerText = this.traindata.data.payload[i].destination;
              row.appendChild(td);
              td = document.createElement('td');
            }
            td.setAttribute('class', 'train-scheduled train-cell');
            td.innerText = scheduledText;
            row.appendChild(td);
            td = document.createElement('td');
            td.setAttribute('class', 'train-arriving train-cell');
            td.innerText = arrivingText;
            row.appendChild(td);
            table.appendChild(row);
            numRows++;
          };
        }
        wrapper.appendChild(table);
        return wrapper;
    },
});
