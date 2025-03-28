import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import grapesjs from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";
import "grapesjs-preset-webpage";
import "grapesjs-plugin-ckeditor";

function WebpageEditor() {
  const location = useLocation();
  const navigate = useNavigate();
  const userId = new URLSearchParams(location.search).get("user_id");
  const [editor, setEditor] = useState(null);
  const [blogContent, setBlogContent] = useState(null);
  const [contentLoaded, setContentLoaded] = useState(false);
  const [useAITemplate, setUseAITemplate] = useState(false);
  const [additionalPrompt, setAdditionalPrompt] = useState("");
  const [useAIImage, setUseAIImage] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState(null);
  const [hostedUrl, setHostedUrl] = useState(null);
  const API_URL = process.env.REACT_APP_API_URL;
  console.log("API Base URL:", API_URL);
  // **Fetch Blog Content from Database**
  useEffect(() => {
    if (userId) {
      axios.get(`${API_URL}/get_blog?user_id=${userId}`)
        .then(response => {
          if (response.data.error) {
            console.error("Error fetching blog:", response.data.error);
          } else {
            setBlogContent(response.data);
            console.log("Fetched Blog Content:", response.data);
          }
        })
        .catch(error => console.error("Error fetching blog:", error));
    }
  }, [userId]);

  // **Initialize GrapesJS AFTER Blog Content is Fetched**
  useEffect(() => {
    if (!blogContent || contentLoaded) return;

    const editorInstance = grapesjs.init({
      container: "#gjs",
      height: "100vh",
      width: "100%",
      storageManager: false,
      plugins: ["gjs-preset-webpage", "grapesjs-plugin-ckeditor"],
      pluginsOpts: {
        "gjs-preset-webpage": { navbar: false },
        "grapesjs-plugin-ckeditor": { options: { language: "en" } },
      },
    });
        // Enable Drag & Drop
        editorInstance.BlockManager.getAll().forEach(block => {
          block.set({ draggable: true });
        });

        // Enable Resizing & Moving
        editorInstance.on("component:add", component => {
          component.set({
            resizable: { tl: 1, tr: 1, bl: 1, br: 1, minWidth: 100, minHeight: 50 },
            draggable: true,
          });


    setEditor(editorInstance);
 }, []);



    // **Ensure Editor is Ready Before Adding Content**
    setTimeout(() => {
      if (editorInstance && blogContent) {
        const blogHtml = `
          <div>
            <h1>${blogContent.title || ""}</h1>
            <p>${blogContent.intro || " "}</p>
            <div>${blogContent.body || " "}</div>
          </div>
        `;

        editorInstance.setComponents(blogHtml);
        setContentLoaded(true);
        console.log("Blog Content Inserted into GrapesJS");
      }
    }, 1000); // **Delay to ensure editor is fully initialized**

  }, [blogContent]);
   // **Upload HTML to S3**
   const handleHost = async () => {
    if (!editor) return;

    const htmlContent = editor.getHtml();

    try {
      const response = await axios.post(`${API_URL}/upload_to_s3`, {
        user_id: userId,
        html_content: htmlContent,
      });

      if (response.data.s3_url) {
        setHostedUrl(response.data.s3_url);
      } else {
        alert("Failed to upload webpage.");
      }
    } catch (error) {
      console.error("Error uploading to S3:", error);
      alert("Error uploading to S3.");
    }
  };


  // **Load AI-generated HTML template**
  const loadAITemplate = async () => {
    if (!userId) {
      alert("User ID is required!");
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/generate_template`, {
        user_id: userId,
        additional_prompt: additionalPrompt,
      });

      if (response.data.html) {
        editor.setComponents(response.data.html);
        setUseAITemplate(true);
      }
    } catch (error) {
      console.error("Error fetching AI template:", error);
    }
  };

  // **Generate AI Image**
  const generateImage = async () => {
    if (!imagePrompt) {
      alert("Please enter an image prompt!");
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/generate_image`, { prompt: imagePrompt });

      if (response.data.image_url) {
        setGeneratedImage(response.data.image_url);
      }
    } catch (error) {
      console.error("Error generating image:", error);
    }
  };

  // **Add AI-Generated Image to Editor**
  const addImageToEditor = () => {
    if (editor && generatedImage) {
      editor.addComponents(`<img src="${generatedImage}" alt="AI Generated Image" style="width:100%;"/>`);
    }
  };
   // **Share to LinkedIn**
  const shareOnLinkedIn = () => {
    if (!hostedUrl) {
      alert("Please host the page first!");
      return;
    }

    const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(hostedUrl)}`;
    window.open(linkedInShareUrl, "_blank", "noopener,noreferrer");
  };
  // // **Save & Navigate to Webpage View**
  // const goToWebpageView = () => {
  //   if (!editor) return;

  //   const htmlContent = editor.getHtml();
  //   const cssContent = editor.getCss();

  //   localStorage.setItem("savedHtml", htmlContent);
  //   localStorage.setItem("savedCss", cssContent);

  //   navigate(`/webpage-view?user_id=${userId}`);
  // };

  return (
    <div>
      <h2>Webpage Editor</h2>

      {/* AI Template Button */}
      <div style={{ marginBottom: "10px" }}>
        <button onClick={() => setUseAITemplate(!useAITemplate)}>
          {useAITemplate ? "Hide AI Template Options" : "Use AI-Generated Template"}
        </button>
      </div>

      {useAITemplate && (
        <div>
          <textarea
            value={additionalPrompt}
            onChange={(e) => setAdditionalPrompt(e.target.value)}
            placeholder="Enter additional modifications..."
            style={{ width: "100%", height: "60px", padding: "10px" }}
          />
          <button onClick={loadAITemplate}>Generate AI Template</button>
        </div>
      )}

      {/* AI Image Generation Button */}
      <div style={{ marginBottom: "10px" }}>
        <button onClick={() => setUseAIImage(!useAIImage)}>
          {useAIImage ? "Hide AI Image Options" : "Generate AI Image"}
        </button>
      </div>

      {useAIImage && (
        <div style={{ marginBottom: "10px" }}>
          <input
            type="text"
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            placeholder="Enter image prompt..."
            style={{ width: "100%", padding: "10px" }}
          />
          <button onClick={generateImage} style={{ padding: "10px", width: "100%", marginTop: "10px" }}>
            Generate Image
          </button>
        </div>
      )}

      {/* Show Generated Image */}
      {generatedImage && (
        <div>
          <h4>Generated Image:</h4>
          <img src={generatedImage} alt="AI Generated" style={{ maxWidth: "100%", marginBottom: "10px" }} />
          <button onClick={addImageToEditor} style={{ padding: "10px", width: "100%" }}>
            Add Image to Editor
          </button>
        </div>
      )}

      {/* GrapesJS Editor */}
      <div id="gjs"></div>

      {/* Navigation Buttons */}
      {/* Buttons */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
        <button onClick={() => navigate("/")}>Previous</button>
        <button onClick={handleHost}>Host</button>
      </div>
      {/* Show Hosted URL */}
      {hostedUrl && (
        <div style={{ marginTop: "20px" }}>
          <h3>Webpage Hosted!</h3>
          <a href={hostedUrl} target="_blank" rel="noopener noreferrer">{hostedUrl}</a>
          {/* Share on LinkedIn Button */}
          <div style={{ marginTop: "10px" }}>
            <button onClick={shareOnLinkedIn} style={{ backgroundColor: "#0077B5", color: "white", padding: "10px", border: "none", cursor: "pointer" }}>
              Share on LinkedIn
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default WebpageEditor;