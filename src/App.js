import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import TextField from "@material-ui/core/TextField";
import AssignmentIcon from "@material-ui/icons/Assignment";
import PhoneIcon from "@material-ui/icons/Phone";
import MicIcon from "@material-ui/icons/Mic";
import MicOffIcon from "@material-ui/icons/MicOff";
import VideocamIcon from "@material-ui/icons/Videocam";
import VideocamOffIcon from "@material-ui/icons/VideocamOff";
import React, { useEffect, useRef, useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import Peer from "simple-peer";
import io from "socket.io-client";

import "./App.css";

const socket = io.connect("http://localhost:5000");

function App() {
  const [me, setMe] = useState("");
  const [stream, setStream] = useState();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState("");
  const [idToCall, setIdToCall] = useState("");
  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();
  const [callerName, setCallerName] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
        if (myVideo.current) {
          myVideo.current.srcObject = stream;
        }
      });

    socket.on("me", (id) => {
      setMe(id);
    });

    socket.on("callUser", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setName(data.name);
      setCallerSignal(data.signal);
      setCallerName(data.name);
    });
  }, []);

  const callUser = (id) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
    });

    peer.on("signal", (data) => {
      socket.emit("callUser", {
        userToCall: id,
        signalData: data,
        from: me,
        name: name,
      });
    });

    peer.on("stream", (stream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }
    });

    socket.on("callAccepted", (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });

    connectionRef.current = peer;
  };

  const answerCall = () => {
    setCallAccepted(true);
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    });

    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: caller });
    });

    peer.on("stream", (stream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }
    });

    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  const leaveCall = () => {
    if (callAccepted && !callEnded) { // Check if call is accepted and not ended
      if (connectionRef.current) {
        connectionRef.current.destroy();
        setCallEnded(true);
        setCallAccepted(false); // Set callAccepted to false after ending the call
      } else {
        console.error("No peer connection available to end the call.");
      }
    }
  };

  const toggleMute = () => {
    setIsMuted((prevMuted) => !prevMuted);
    // Toggle the state of audio tracks
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !isMuted;
    });
  };

  const toggleCamera = () => {
    setIsCameraOff((prevCameraOff) => !prevCameraOff);
    // Toggle the state of video tracks
    stream.getVideoTracks().forEach((track) => {
      track.enabled = !isCameraOff;
    });
  };

  return (
    <div className="h-screen flex flex-col justify-center items-center bg-emerald-100">
      {receivingCall && !callAccepted && (
        <h2 className="text-center text-white mb-4">{callerName} is calling...</h2>
      )}
      <div className="flex">
        <div className="w-96 mr-4">
          {stream && (
            <video
              className="w-full rounded-lg"
              playsInline
              muted
              ref={myVideo}
              autoPlay
            />
          )}
        </div>
        <div className="w-96">
          {callAccepted && !callEnded && (
            <video
              className="w-full rounded-lg"
              playsInline
              ref={userVideo}
              autoPlay
            />
          )}
        </div>
      </div>
      <div className="mt-8">
        <input
          className="mb-4 p-2 rounded border border-gray-300 m-3 bg-gray-300"
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <CopyToClipboard text={me} onCopy={() => alert("ID copied")}>
          <button className="mb-4 p-2 rounded bg-emerald-500 text-gray-800 font-semibold m-3">
            Copy ID
          </button>
        </CopyToClipboard>
        <input
          className="mb-4 p-2 rounded border border-gray-300 m-3 bg-gray-300"
          type="text"
          placeholder="ID to call"
          value={idToCall}
          onChange={(e) => setIdToCall(e.target.value)}
        />
        <div className="flex justify-center">
          {callAccepted && !callEnded ? (
            <Button
              variant="contained"
              color="secondary"
              onClick={leaveCall}
              className="mr-4 m-3"
            >
              End Call
            </Button>
          ) : (
            <>
              <IconButton
                color="primary"
                aria-label="call"
                onClick={() => callUser(idToCall)}
                className="mr-4"
              >
                <PhoneIcon fontSize="large" />
              </IconButton>
              {receivingCall && !callAccepted && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={answerCall}
                  style={{ marginBottom: "1rem" }}
                  className="bg-green-500"
                >
                  Answer
                </Button>
              )}
            </>
          )}
        </div>
        <div className="flex justify-center mt-4">
          <IconButton color="primary" onClick={toggleCamera}>
            {isCameraOff ? <VideocamIcon /> : <VideocamOffIcon />}
          </IconButton>
          <IconButton color="primary" onClick={toggleMute}>
            {isMuted ? <MicIcon /> : <MicOffIcon />}
          </IconButton>
        </div>
      </div>
    </div>
  );
}

export default App;
