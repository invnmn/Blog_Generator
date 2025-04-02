import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { Loader2, Share2, Image as ImageIcon, Layout, Linkedin, Save } from "lucide-react";
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
  const [isLoading, setIsLoading] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  // const fullHtml = editor.getWrapper().toHTML();
  

  useEffect(() => {
    if (userId) {
      fetchBlogContent();
    }
  }, [userId]);

  // useEffect(() => {
  //   if (!blogContent || contentLoaded) return;
  //   initializeEditor();
  // }, [blogContent]);
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
  
    // // Enable Drag & Drop for all blocks
    // editorInstance.BlockManager.getAll().forEach((block) => {
    //   block.set({ draggable: true });
    // });
  
    // Enable Resizing & Moving for added components
    editorInstance.on("component:add", (component) => {
      component.set({
        resizable: {
          tl: 1, tr: 1, bl: 1, br: 1,
          minWidth: 100,
          minHeight: 50
        },
        draggable: true,
      });
    });
  
    setEditor(editorInstance);
  }, [blogContent, contentLoaded]);
  

  const fetchBlogContent = async () => {
    try {
      const response = await axios.get(`${API_URL}/get_blog?user_id=${userId}`);
      if (response.data.error) {
        toast.error("Error fetching blog content");
      } else {
        setBlogContent(response.data);
      }
    } catch (error) {
      toast.error("Failed to fetch blog content");
    }
  };

  const initializeEditor = () => {
    const editorInstance = grapesjs.init({
      container: "#gjs",
      height: "70vh",
      width: "auto",
      storageManager: false,
      plugins: ["gjs-preset-webpage", "grapesjs-plugin-ckeditor"],
      pluginsOpts: {
        "gjs-preset-webpage": { navbar: false },
        "grapesjs-plugin-ckeditor": { options: { language: "en" } },
      },
      canvas: {
        styles: [
          "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css",
        ],
      },
    });

    setEditor(editorInstance);
    
    setTimeout(() => {
      if (blogContent) {
        const blogHtml = `
          <div class="max-w-4xl mx-auto px-4 py-8">
            <h1 class="text-4xl font-bold mb-6">${blogContent.title || ""}</h1>
            <div class="prose prose-lg">${blogContent.intro || ""}</div>
            <div class="mt-8 prose prose-lg">${blogContent.body || ""}</div>
          </div>
        `;
        editorInstance.setComponents(blogHtml);
        setContentLoaded(true);
      }
    }, 1000);
  };

  const saveWebpage = async () => {
    if (!editor) return;
    const htmlContent = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>My Webpage</title>'+"<style>" + editor.getCss() + "</style>"+ editor.getHtml();

    try {
      const response = await axios.post(`${API_URL}/save_webpage`, {
        user_id: userId,
        html_content: htmlContent,
      });

      if (response.data.success) {
        toast.success("Webpage saved successfully!");
      } else {
        toast.error("Failed to save webpage");
      }
    } catch (error) {
      toast.error("Error saving webpage");
    }
  };

  const handleHost = async () => {
    if (!editor) return;
    setIsLoading(true);

    try {
      // const htmlContent = editor.getHtml();
      const htmlContent = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>My Webpage</title>'+"<style>" + editor.getCss() + "</style>"+ editor.getHtml();

      const response = await axios.post(`${API_URL}/upload_to_s3`, {
        user_id: userId,
        html_content: htmlContent,
      });

      if (response.data.s3_url) {
        setHostedUrl(response.data.s3_url);
        toast.success("Webpage hosted successfully!");
      } else {
        toast.error("Failed to upload webpage");
      }
    } catch (error) {
      toast.error("Error uploading to S3");
    } finally {
      setIsLoading(false);
    }
  };

  const generateImage = async () => {
    if (!imagePrompt) {
      toast.error("Please enter an image prompt");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/generate_image`, {
        prompt: imagePrompt,
      });

      if (response.data.image_url) {
        setGeneratedImage(response.data.image_url);
        toast.success("Image generated successfully!");
      }
    } catch (error) {
      toast.error("Failed to generate image");
    } finally {
      setIsLoading(false);
    }
  };

  const addImageToEditor = () => {
    if (editor && generatedImage) {
      editor.addComponents(`
        <img src="${generatedImage}" 
             alt="AI Generated Image" 
             class="max-w-full h-auto rounded-lg shadow-lg my-8"/>
      `);
      toast.success("Image added to editor");
    }
  };

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("user_id", "user123");

    const response = await fetch(`${API_URL}/generate_image`, {
        method: "POST",
        body: formData,
    });

    const data = await response.json();
    console.log("Image S3 URL:", data.s3_url);
    return data.s3_url;
};
  

  const generateAITemplate = async () => {
        if (!userId) {
          toast.error("User ID is required!");
          return;
        }
    
        setIsLoading(true);
        try {
          const response = await axios.post(`${API_URL}/generate_template`, {
            user_id: userId,
            additional_prompt: additionalPrompt,
          });
    
          if (response.data.html) {
            editor.setComponents(response.data.html);
            toast.success("AI template generated successfully!");
          }
        } catch (error) {
          toast.error("Failed to generate AI template");
        } finally {
          setIsLoading(false);
        }
      };
      
  const shareOnLinkedIn = () => {
    if (!hostedUrl) {
      toast.error("Please host the page first!");
      return;
    }

    const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(hostedUrl)}`;
    window.open(linkedInShareUrl, "_blank", "noopener,noreferrer");
    toast.success("Opening LinkedIn sharing dialog");
  };

      return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
              {/* Header with buttons */}
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-gray-900">Webpage Editor</h2>
                <div className="flex gap-4">
                  <button
                    onClick={() => setUseAITemplate(!useAITemplate)}
                    className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <Layout className="h-4 w-4 mr-2" />
                    {useAITemplate ? "Hide AI Template" : "Generate AI Template"}
                  </button>
                  <button
                    onClick={() => setUseAIImage(!useAIImage)}
                    className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    {useAIImage ? "Hide AI Image" : "Generate AI Image"}
                  </button>
                  <button
                    onClick={saveWebpage} // Updated function
                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Webpage
                  </button>
                </div>
              </div>
        
              {/* AI Template Section */}
              {useAITemplate && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <textarea
                    value={additionalPrompt}
                    onChange={(e) => setAdditionalPrompt(e.target.value)}
                    placeholder="Enter additional template instructions..."
                    className="w-full px-4 py-2 border rounded-md h-24 resize-none"
                  />
                  <button
                    onClick={generateAITemplate}
                    disabled={isLoading}
                    className="w-full py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                  >
                    {isLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : "Generate AI Template"}
                  </button>
                </div>
              )}
        
              {/* AI Image Section */}
              {useAIImage && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="text"
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="Enter image prompt..."
                    className="w-full px-4 py-2 border rounded-md"
                  />
                  <div className="flex gap-4">
                    <button
                      onClick={generateImage}
                      disabled={isLoading}
                      className="flex-1 py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {isLoading ? <Loader2 className="animate-spin h-4 w-4 mx-auto" /> : "Generate Image"}
                    </button>
                    {generatedImage && (
                      <button
                        onClick={addImageToEditor}
                        className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Add to Editor
                      </button>
                    )}
                  </div>
                  {generatedImage && <img src={generatedImage} alt="AI Generated" className="max-w-full h-auto rounded-lg shadow-sm" />}
                </div>
              )}
        
              {/* GrapesJS Editor */}
              <div id="gjs" className="border rounded-lg min-h-[70vh]"></div>
        
              {/* Host Webpage Button Below the Editor */}
              <div className="flex justify-end mt-6">
                <button
                  onClick={handleHost}
                  disabled={isLoading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? "Hosting..." : "Host Webpage"}
                </button>
              </div>
        
              {/* Hosted URL Section */}
              {hostedUrl && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Webpage Hosted!</h3>
                  <div className="flex items-center justify-between">
                    <a href={hostedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                      {hostedUrl}
                    </a>
                    <button
                      onClick={shareOnLinkedIn}
                      className="flex items-center px-4 py-2 text-sm font-medium text-white bg-[#0A66C2] rounded-md hover:bg-[#004182]"
                    >
                      <Linkedin className="h-4 w-4 mr-2" />
                      Share on LinkedIn
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
       
      );
      


}

export default WebpageEditor;

