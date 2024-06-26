document.getElementById('startButton').addEventListener('click', async function() { //attach an event handler function to the HTML element triggered by a click. async function allows use of await, that is, function exec. paused till promise resolved(actually returned or rejected)
    const video = document.getElementById('video');  
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');  //get the 2d rendering context of canvas element to draw
    let stream;

    try {  //always use try catch inside async for resolving the promise
        // Request access to the webcam stream
        stream = await navigator.mediaDevices.getUserMedia({ video: true }); //stream is a MediaStream object. await is used for waiting for a resolve. navigator.mediaDevices is used for access to connected media devices. getUserMedia is used to get User permission. video=true signifies it asks for video permission
        video.srcObject = stream; //set source of video as the stream object
        video.play();  //play the video

        // Function to send captured frame to backend for processing
        async function sendFrameToBackend() {
            try {
                // Capture frame from the canvas
                context.drawImage(video, 0, 0, canvas.width, canvas.height); //draws current video frame on the canvas
                const frame = canvas.toDataURL('image/jpeg');  //converts the canvas image into Base64 encoded jpeg format

                // Send frame to backend
                const response = await fetch('/process_frame', {  //fetch is used to send HTTP request to backend. returns a promise. so needs await till resolved
                    method: 'POST',   //POST request used for sending data to backend
                    headers: {    
                        'Content-Type': 'application/json',  //declares that content/body of request is a JSON string
                    },
                    body: JSON.stringify({ image: frame })  //converts the {image:frame} object into a JSON string
                });

                if (!response.ok) {   //checks if response has code within 200-299. if yes, then ok. 500 is not within range
                    throw new Error(`HTTP error! Status: ${response.status}`);  
                }

                // Parse JSON response from backend
                const result = await response.json();   
                return result;
            } catch (error) {
                console.error('Error sending frame to backend:', error);
                return { bounding_boxes: [] }; // Return empty array to avoid drawing incorrect data
            }
        }

        // Function to draw bounding boxes and moods on the canvas
        function drawBoundingBoxes(boundingBoxes) {
            
            // Clear the canvas
            context.clearRect(0, 0, canvas.width, canvas.height);
            
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
            // Set styles for text and bounding boxes
            context.font = '40px Arial';
            context.fillStyle = 'yellow';
            context.strokeStyle = 'yellow';
            context.lineWidth = 2;
        
            // Draw bounding boxes around detected faces
            boundingBoxes.forEach(box => {
                context.strokeRect(box.x, box.y, box.width, box.height);
                context.fillText(box.mood, box.x, box.y);  //write the mood at the top left corner. x and y are coordinates of text written
            });
        }
        

        // Function to continuously capture and process frames
        async function drawFrame() {
            const result = await sendFrameToBackend();
            drawBoundingBoxes(result.bounding_boxes);
            await new Promise(resolve => setTimeout(resolve, 200));  //new Promise object created which calls the resolve function after 200 ms
            requestAnimationFrame(drawFrame);  //draws another frame on the canvas just as the browser repaints due to video playing
        }

        // Start drawing frames
        drawFrame();

        // Stop button functionality
        document.getElementById('stopButton').addEventListener('click', function() {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());  // stops all the MediaStream objects
            }
            video.srcObject = null;
            context.clearRect(0, 0, canvas.width, canvas.height);
        });

    } catch (err) {
        console.error('Error accessing webcam: ', err);
    }
});
