from flask import Flask, request, jsonify, render_template
import base64
from io import BytesIO
from PIL import Image
import numpy as np
import cv2
from keras.models import model_from_json

app = Flask(__name__) #initiates a Flask application of the current module (starts a web server). __name__ is inbuilt variable representing the name of current module. if run directly, equal to __main__. otherwise can be imported

# Load the Haar Cascade classifier globally
haar_file = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
face_cascade = cv2.CascadeClassifier(haar_file)

# Load the emotion detection model
with open("emotiondetector.json", "r") as json_file:
    model_json = json_file.read()
model = model_from_json(model_json)
model.load_weights("emotiondetector.h5")

# Emotion labels
labels = {0: 'angry', 1: 'disgust', 2: 'fear', 3: 'happy', 4: 'neutral', 5: 'sad', 6: 'surprise'}

@app.route('/')   #this is a route which is matched with current URL. then the 'view' function is seen
def home():       #view function
    return render_template('index.html')  #returns the response for web browser. can be string(converted to HTTP response), HTML page or JSON object (for APIs)

@app.route('/process_frame', methods=['POST'])  #ONLY POST REQUEST ACCEPTED. THAT IS, frontend sends a request with an object (image frame in this case) in the form of JSON object
def process_frame():
    try:
        data = request.json  #request contains all info about incoming HTTP request. .json parses the JSON data and gives back a Python dictionary
        image_data = data['image'].split(",")[1]  #accesses the value of 'image' key in the dictionary. The value is a base64 encoded string representing image. the actual image string is prefixed with random shit before a ',' . So, split with ',' and get the second element
        image = Image.open(BytesIO(base64.b64decode(image_data)))  # b64 decodes the Base64 string into actual binary string. BytesIO converts the binary string into a file like object. Image.open opens the file like object

        # Convert image to grayscale
        gray = image.convert('L')
        gray_np = np.array(gray)

        # Detect faces in the image
        faces = face_cascade.detectMultiScale(gray_np, scaleFactor=1.3, minNeighbors=5)

        bounding_boxes = []
        for (x, y, w, h) in faces:
            # Extract face region
            face = gray_np[y:y+h, x:x+w]
            face = cv2.resize(face, (48, 48))
            face = face.reshape(1, 48, 48, 1) / 255.0

            # Predict emotion
            pred = model.predict(face)
            prediction_label = labels[pred.argmax()]

            bounding_boxes.append({
                "x": int(x),
                "y": int(y),
                "width": int(w),
                "height": int(h),
                "mood": prediction_label
            })

        return jsonify({"bounding_boxes": bounding_boxes}) #converts the string to a JSON formatted string using the jsonify method

    except Exception as e:  # e is the exception object
        print(f"Error processing frame: {e}") # a F string which prints the error message
        return jsonify({"error": str(e)}), 500  # a JSON response is sent back containing the exception object converted to string and error code 500 denoting HTML Internal Server Error

if __name__ == '__main__':  #only run server if script run directly and not imported
    app.run(debug=True)     #run server in debug mode which shows error pages and refreshes server for code changes
