var audioContext;

var bufferLoader;
var analyserNode;
var filterNode;
var loadedBuffer;

var playingState = 0;

var timeDomainData;
var frequencyData;

var canvasWaveform;
var canvasWaveformFB;
var canvasCurrentWaveform;
var canvasTimeDomain;
var canvasFrequency;
var canvasSpectrogram;

var ctxWf;
var ctxWfFB;
var ctxCWf;
var ctxTD;
var ctxFq;
var ctxSp;

var bufferSource;

var tempCanvas;
var tempCtx;

var lastCalledTime;
var fps;

var startTime;

var hot = new chroma.ColorScale({
	colors:['#000000', '#0000ff', '#21FFAE', '#FFFFFF'],
	positions:[0, .4, .7, 1],
	mode:'rgb',
	limits:[0, 300]
});

if (!window.requestAnimationFrame) {
	if (window.webkitRequestAnimationFrame) {
		window.requestAnimationFrame = window.webkitRequestAnimationFrame;
	} else if (window.mozRequestAnimationFrame) {
		window.requestAnimationFrame = window.mozRequestAnimationFrame;
	} else {
		alert("your brwoser has no requestAnimationFrame support.");
	}
}

function message(msg){
	now  = new Date();
	$("#message").html( now.toLocaleString() + "." + formatInt(now.getMilliseconds(),3) + " " +  msg + "<br />" + $("#message").html());
}

function formatInt(value, digit){
	padding = "";
	for(i=0;i<digit;i++){
		if(Math.floor(value / Math.pow(10,i)) == 0){
			padding = padding + "0";
		}
	}
	return padding + value;
}

$(function(){
	init();

	$("html").bind("drop", function(e){
		e.stopPropagation();
		e.preventDefault();

		handleDroppedFiles(e.originalEvent.dataTransfer.files);
		message("file dropped");
		//file.name
		//size
		//type
	}).bind("dragenter dragover", false);

});

function init(){
	message("initializing...");
	try {
		if(window.webkitAudioContext){audioContext = new webkitAudioContext();}
		if(window.AudioContext){audioContext = new AudioContext();}
		analyserNode = audioContext.createAnalyser();
		timeDomainData = new Uint8Array(analyserNode.frequencyBinCount);
		frequencyData = new Uint8Array(analyserNode.frequencyBinCount);

		message("analyserNode.fftSize: " + analyserNode.fftSize);
		message("analyserNode.frequencyBinCount: " + analyserNode.frequencyBinCount);
		message("initial analyserNode.smoothingTimeConstant: " + analyserNode.smoothingTimeConstant);

		message("initial analyserNode.minDecibels / maxDecibels: " + analyserNode.minDecibels + " / " + analyserNode.maxDecibels);

		message("set analyserNode.smoothingTimeConstant to 0.");
		analyserNode.smoothingTimeConstant = 0.0;

		filterNode = audioContext.createBiquadFilter();
		filterNode.connect(audioContext.destination);
		filterNode.connect(analyserNode);

		filterNode.type = getBiquadFilterType(7);//ALL_PASS
		filterNode.frequency.value = 5000;
		filterNode.Q.value = 5;

		message("canvas setup");
		//canvas setup

		canvasTimeDomain = $("#canvasTimeDomain")[0];
		ctxTD = canvasTimeDomain.getContext('2d');

		canvasFrequency = $("#canvasFrequency")[0];
		ctxFq = canvasFrequency.getContext('2d');

		canvasSpectrogram = $("#canvasSpectrogram")[0];
		ctxSp = canvasSpectrogram.getContext("2d");

		// create a temp canvas we use for copying
		tempCanvas = document.createElement("canvas");
		tempCtx = tempCanvas.getContext("2d");
		tempCanvas.width=canvasSpectrogram.width;
		tempCanvas.height=canvasSpectrogram.height;

		setInterval(function(){
			analyserNode.getByteTimeDomainData(timeDomainData);
			drawTimeDomain(timeDomainData);
		},50);

		message("[initialized.]");

	}catch(e) {
		message("["+e+"]");
		message("Web Audio API is not supported in this browser.");
		message("please try with Google Chrome.");
	}
	updateFrame();

}

function handleDroppedFiles(files){
	var file = files[0];

	message("dropped file : "+file.name + " ("+file.type+")");

	if(getFileExtension(file.name).toLowerCase() == "gbs" ||
		getFileExtension(file.name).toLowerCase() == "nsf" ||
		getFileExtension(file.name).toLowerCase() == "spc"
		){
		// create the reader to access the local file (note: browser have different security restrictions)
		var reader = new FileReader();
		reader.onerror = function(){message("reader error");}; // event handle on failure
		// load the file as array buffer
		reader.readAsArrayBuffer(file);

		// init the reader event handlers
		reader.onload = function (e)
		{
			message("file loaded.");
			var arrayBuffer = new Uint8Array(e.target.result);
			playMusicData(arrayBuffer, 0);
			updateSongInfoDropped(file.name, 0);

		}; // event handle on success
	}else{
		message("not supported file type.");
	}
}


function updateFrame(){
	analyserNode.getByteFrequencyData(frequencyData);

	drawFrequency(frequencyData);
	drawSpectrogram(frequencyData);

	if(!lastCalledTime) {
		lastCalledTime = new Date().getTime();
		fps = 0;
	}else{
		delta = (new Date().getTime() - lastCalledTime)/1000;
		lastCalledTime = new Date().getTime();
		fps = 1/delta;
	}
	$("#fps").html(Math.round(fps) + "FPS");


	requestAnimationFrame(updateFrame);
}

function convertoS2MS(sec){
	var m = Math.floor((sec/60)%60);
	var s = Math.floor(sec%60);
	if(m<10){m = "0" +m}
	if(s<10){s = "0" +s}
	return m+":"+s;
}

function drawTimeDomain(data){
	ctxTD.beginPath();
	ctxTD.fillStyle = "black";
	ctxTD.rect(0, 0, canvasTimeDomain.width, canvasTimeDomain.height);
	ctxTD.fill();
	var value;
	ctxTD.beginPath();
	ctxTD.moveTo(0,-999);

	var Height = canvasTimeDomain.height;
	var divider = (256.0 / Height);

	for (var i=0; i<data.length; ++i){
		value = (data[i] - 256 / divider) / divider  + (canvasTimeDomain.height / divider);
		ctxTD.lineTo(i,value);
	}
	ctxTD.moveTo(0,999);
	ctxTD.closePath();
	ctxTD.strokeStyle = "gray";
	ctxTD.stroke();
}

function drawFrequency(data){
	ctxFq.beginPath();
	ctxFq.fillStyle = "black";
	ctxFq.rect(0, 0, canvasFrequency.width, canvasFrequency.height);
	ctxFq.fill();
	var value;
	ctxFq.beginPath();
	ctxFq.moveTo(0,-999);

	var gradient = ctxFq.createLinearGradient(0,0,0,300);
	gradient.addColorStop(0,'#ffffff');
	gradient.addColorStop(0.1,'#ffffff');
	gradient.addColorStop(0.9,'#000000');
	gradient.addColorStop(1,'#000000');

	//ctxFq.fillStyle = gradient;
	//ctxFq.fillStyle = "gray";
	var fqHeight = canvasFrequency.height;
	var divider = (256.0 / fqHeight);
	for (var i=0; i<data.length; ++i){
		value =  fqHeight -  data[i] / divider;// - 128 + canvasFrequency.height / 2;
		ctxFq.lineTo(i,value);
		ctxFq.fillStyle = hot.getColor(data[i]).hex();
		ctxFq.fillRect(i, fqHeight - data[i] /  divider, 1, data[i]/ divider);
	}
	ctxFq.moveTo(0,999);
	ctxFq.closePath();
	ctxFq.strokeStyle = "gray";
	ctxFq.stroke();

}

function drawSpectrogram(array) {
	// copy the current canvas onto the temp canvas
	tempCtx.drawImage(canvasSpectrogram, 0, 0, canvasSpectrogram.width, canvasSpectrogram.height);
	var frameHeight = 3;
	// iterate over the elements from the array
	for (var i = 0; i < array.length; i++) {
		// draw each pixel with the specific color
		var value = array[i];
		ctxSp.fillStyle = hot.getColor(value).hex();

		// draw the line at the right side of the canvas
		//audioContext . fillRect(x, y, w, h)
		ctxSp.fillRect(i,0, 1, frameHeight);
	}

	// set translate on the canvas
	ctxSp.translate(0, frameHeight);
	// draw the copied image
	ctxSp.drawImage(tempCanvas, 0, 0, canvasSpectrogram.width, canvasSpectrogram.height, 0, 0, canvasSpectrogram.width, canvasSpectrogram.height);

	// reset the transformation matrix
	ctxSp.setTransform(1, 0, 0, 1, 0, 0);
}

function getBiquadFilterType(index){
	switch(index){
	case 0:return "lowpass";break;
	case 1:return "highpass";break;
	case 2:return "bandpass";break;
	case 3:return "lowshelf";break;
	case 4:return "highshelf";break;
	case 5:return "peaking";break;
	case 6:return "notch";break;
	case 7:return "allpass";break;
	}
}

function filterSetup() {
	var selectedIndex = $('input[name="filterType"]:checked').val();
//	filterNode.type = parseInt(selectedIndex);
	filterNode.type = getBiquadFilterType(parseInt(selectedIndex));
	$("#freqlabel").html(parseFloat($("#freq").val())+ "Hz");
	$("#qlabel").html(parseFloat($("#q").val()));
	$("#gainlabel").html(parseFloat($("#gain").val()));

	filterNode.frequency.value = parseFloat($("#freq").val());
	filterNode.Q.value =  parseFloat($("#q").val());
	filterNode.gain.value = parseFloat($("#gain").val());
	//console.log("selectedIndex"+selectedIndex);
	switch(selectedIndex){
		case "0"://LPF
			$("#q").removeAttr("disabled");
			$("#gain").attr("disabled",true);
			break;
		case "1"://HPF
			$("#q").removeAttr("disabled");
			$("#gain").attr("disabled",true);
			break;
		case "2"://BPF
			$("#q").removeAttr("disabled");
			$("#gain").attr("disabled",true);
			break;
		case "3"://LowShelf
			$("#q").attr("disabled",true);
			$("#gain").removeAttr("disabled");
			break;
		case "4"://HighShelf
			$("#q").attr("disabled",true);
			$("#gain").removeAttr("disabled");
			break;
		case "5"://Peaking
			$("#q").removeAttr("disabled");
			$("#gain").removeAttr("disabled");
			break;
		case "6"://Notch
			$("#q").removeAttr("disabled");
			$("#gain").attr("disabled",true);
			break;
		case "7"://AllPass
			$("#q").removeAttr("disabled");
			$("#gain").attr("disabled",true);
			break;
		default:
			break;
	}
}