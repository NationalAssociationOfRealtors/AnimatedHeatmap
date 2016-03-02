'use strict';

if (typeof module !== 'undefined') module.exports = AnimatedHeatmap;

var Timestamp = L.Control.extend({
    options: {
        position: 'bottomright',
        id: 'timestamp',
        //control position - allowed: 'topleft', 'topright', 'bottomleft', 'bottomright'
    },
    onAdd: function (map) {
        var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        container.id = this.options.id;
        container.style.backgroundColor = 'white';
        container.style.width = '260px';
        container.style.height = '30px';
        container.style.padding = '7px';
        return container;
    }
});

function AnimatedHeatmap(location, zoom, data, container, tiles, start, end, interval, playback_rate, loop, heatmap_config){
    this.location = location;
    this.data = data;
    this.container = container;
    this.places = {};
    console.log(heatmap_config);
    this.heatmap_data = [];
    this.heatmapLayer = L.heatLayer(this.heatmap_data, heatmap_config);
    var tiles = new L.TileLayer(tiles, {maxZoom: 22,});
    this.map = new L.map(container, {
        layers: [tiles, this.heatmapLayer],
        center: new L.LatLng(location.coords[0], location.coords[1]),
        zoom: zoom,
    });
    this.map.addControl(new Timestamp({id:"timestamp-"+this.location.id}));
    this.te = new TimespanEmitter(
        start,
        end,
        interval,
        playback_rate,
        loop
    );
    this.init_data();
};

AnimatedHeatmap.prototype.init_data = function(){
    for(var i in this.data){
        var s = this.data[i];
        var t = new Date(s.time);
        s.time = t.getTime();
        s.end = s.time+(s.dwell_time*1000);
        s.visible = false;
        this.places[s.place_id] = [parseFloat(s.lat), parseFloat(s.lng), 0, s.place_id];
    }
};

AnimatedHeatmap.prototype.remove_place = function(place){
    for(var i in this.heatmap_data){
        var p = this.heatmap_data[i];
        if(p[3] == place[3]){
            this.heatmap_data.slice(i, 1);
        }
    }
};

AnimatedHeatmap.prototype.looped = function(){
    console.log("looped");
    for(var i in this.places){
        this.places[i][2] = 0;
    }
    this.heatmap_data = [];
    this.heatmapLayer.setLatLngs(this.heatmap_data);
};

AnimatedHeatmap.prototype.start = function(){
    this.te.addListener('looped', this.looped, this);
    this.te.addListener('timer', this.timer, this);
    this.te.start();
}

AnimatedHeatmap.prototype.timer = function(timestamp){
    $("#timestamp-"+this.location.id).html(timestamp);
    var now = timestamp.getTime();
    for(var i in this.data){
        var s = this.data[i];
        var place = this.places[s.place_id];
        if(s.time <= now && s.end >= now && !s.visible){
            if(!place[2]) this.heatmap_data.push(place);
            s.visible = true;
            place[2]+=.1;
        }else if(s.end < now && s.visible){
            s.visible = false;
            place[2]-=.1;
            if(!place[2]) this.remove_place(place);
        }
    }
    this.heatmapLayer.setLatLngs(this.heatmap_data);
};
