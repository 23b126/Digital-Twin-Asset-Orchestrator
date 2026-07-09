# 3D_ENGINE.PY - Python Backend for Image-to-3D Synthesis (Modular)
# This script can be run independently to provide real Image-to-3D mesh generation.

from flask import Flask, request, jsonify
import requests
import os

app = Flask(__name__)

# fal.ai API key
FAL_KEY = os.getenv("FAL_KEY", "YOUR_FAL_KEY")

@app.route("/api/v1/generate-3d", methods=["POST"])
def generate_3d():
    data = request.json
    image_url = data.get("image_url")
    
    if not image_url:
        return jsonify({"error": "Image URL is required"}), 400

    try:
        # fal.ai integration using TripoSR
        headers = {
            "Authorization": f"Key {FAL_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "image_url": image_url
        }
        
        response = requests.post("https://fal.run/fal-ai/tripo-sr", json=payload, headers=headers)
        
        if response.status_code == 200:
            res_data = response.json()
            glb_url = res_data.get("model_mesh", {}).get("url") or res_data.get("model_url")
            
            return jsonify({
                "status": "SUCCEEDED",
                "model_url": glb_url,
                "message": "3D Mesh generated successfully via fal.ai TripoSR."
            })
        else:
            return jsonify({"error": f"fal.ai error: {response.text}"}), response.status_code
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    print("[PYTHON] 3D Synthesis Engine v3.1 (fal.ai) starting...")
    app.run(port=5000)
