const message = msg => console.log(msg);

const play = (fileName, trackNo) => {
  if(node){
    node.disconnect();
    node = null;
  }

  const xhr = new XMLHttpRequest();
  xhr.open('GET', fileName, true);
  xhr.responseType = 'arraybuffer';
  xhr.onerror = (e) => {
    message(e);
  };
  xhr.onload = function(e) {
    if (this.status === 404){
      message('not found');
      return;
    }
    const payload = new Uint8Array(this.response);
    playMusicData(payload, trackNo);
    updateSongInfo(fileName, trackNo);
  };
  xhr.send();
};

const stop = () => {
  node.disconnect();
  if (Module.ccall("gme_delete", "number", ["number"], [emu]) != 0) {
    message("could not stop track");
  }
};

let ref;
let emu;
let node;

function parse_metadata(ref) {
       var offset = 0;

       var read_int32 = function() {
               var value = Module.getValue(ref + offset, "i32");
               offset += 4;
               return value;
       }

       var read_string = function() {
               var value = Module.Pointer_stringify(Module.getValue(ref + offset, "i8*"));
               offset += 4;
               return value;
       }

       var res = {};

       res.length = read_int32();
       res.intro_length = read_int32();
       res.loop_length = read_int32();
       res.play_length = read_int32();

       offset += 4*12; // skip unused bytes

       res.system = read_string();
       res.game = read_string();
       res.song = read_string();
       res.author = read_string();
       res.copyright = read_string();
       res.comment = read_string();

       return res;
}

function updateSongInfo(filename, subtune){
               var subtune_count = Module.ccall("gme_track_count", "number", ["number"], [emu]);

               if (Module.ccall("gme_track_info", "number", ["number", "number", "number"], [emu, ref, subtune]) != 0)
                       console.error("could not load metadata");

               var metadata = parse_metadata(Module.getValue(ref, "*"));

               var element = document.getElementById("metadata");

  message('playing', filename, metadata);
}

const playMusicData = (payload, subtune) => {
	message("subtune:"+subtune);
		if (!window.AudioContext) {
			if (window.webkitAudioContext) {
				window.AudioContext = window.webkitAudioContext;
			} else if (window.mozAudioContext) {
				window.AudioContext = window.mozAudioContext;
			} else {
				message("Web Audio API is not supported.");
			}
		}


		try{
			//他のところで作ったのを使いまわす
			ctx = new AudioContext();
		}catch(e){
			alert("audio api error.please reload..: "+e);
			return;
		}

		ref = Module.allocate(1, "i32", Module.ALLOC_STATIC);

		var samplerate = ctx.sampleRate;

		if (Module.ccall("gme_open_data", "number", ["array", "number", "number", "number"], [payload, payload.length, ref, samplerate]) != 0){
			console.error("gme_open_data failed.");
			return;
		}
		emu = Module.getValue(ref, "i32");

		var subtune_count = Module.ccall("gme_track_count", "number", ["number"], [emu]);

		Module.ccall("gme_ignore_silence", "number", ["number"], [emu, 1]);

		var voice_count = Module.ccall("gme_voice_count", "number", ["number"], [emu]);
		message("Channel count: ", voice_count);
		message("Track count: ", subtune_count);

		if (Module.ccall("gme_start_track", "number", ["number", "number"], [emu, subtune]) != 0)
			message("could not load track");


		var bufferSize = 1024 * 16;
//		var bufferSize = 1024 * 4;
		var inputs = 2;
		var outputs = 2;

		if(!node && ctx.createJavaScriptNode)node = ctx.createJavaScriptNode(bufferSize, inputs, outputs);
		if(!node && ctx.createScriptProcessor)node = ctx.createScriptProcessor(bufferSize, inputs, outputs);

		var buffer = Module.allocate(bufferSize * 2, "i32", Module.ALLOC_STATIC);

		var INT16_MAX = Math.pow(2, 32) - 1;

		node.onaudioprocess = function(e) {
			if (Module.ccall("gme_track_ended", "number", ["number"], [emu]) == 1) {
				node.disconnect();
				message("end of stream");
				return;
			}

			var channels = [e.outputBuffer.getChannelData(0), e.outputBuffer.getChannelData(1)];

			var err = Module.ccall("gme_play", "number", ["number", "number", "number"], [emu, bufferSize * 2, buffer]);
			for (var i = 0; i < bufferSize; i++)
				for (var n = 0; n < e.outputBuffer.numberOfChannels; n++)
					channels[n][i] = Module.getValue(buffer + i * e.outputBuffer.numberOfChannels * 2 + n * 4, "i32") / INT16_MAX;
		}

        node.connect(ctx.destination);

		window.savedReferences = [ctx, node];
}
