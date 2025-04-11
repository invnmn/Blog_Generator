import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { Loader2, Share2, Image as ImageIcon, Layout, Linkedin, Save, Eye, Download, FileText, Twitter } from "lucide-react";
import grapesjs from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";
import grapesjsTailwind from "grapesjs-tailwind";
import grapesjsBlocksBasic from "grapesjs-blocks-basic";
function WebpageEditor() {
  const navigate = useNavigate();
  const { topicId } = useParams();
  const userId = localStorage.getItem("userId");
  const [editor, setEditor] = useState<any>(null);
  const [blogContent, setBlogContent] = useState<any>(null);
  const [webpageContent, setWebpageContent] = useState<string | null>(null); // State for webpage content
  const [contentLoaded, setContentLoaded] = useState(false);
  const [useAITemplate, setUseAITemplate] = useState(false);
  const [additionalPrompt, setAdditionalPrompt] = useState("");
  const [useAIImage, setUseAIImage] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [hostedUrl, setHostedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [useBlogGenerator, setUseBlogGenerator] = useState(false);
  const [modifyPrompt, setModifyPrompt] = useState("");
  const [sharePlatform, setSharePlatform] = useState<string | null>(null); // For share dropdown
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  useEffect(() => {
    if (userId && topicId) {
      setContentLoaded(false); // Reset contentLoaded when topicId changes
      setWebpageContent(null); // Clear previous content to avoid stale data
      fetchWebpageContent().then(() => {
        console.log("Webpage content fetch completed for topicId:", topicId);
      }).catch((error) => {
        console.error("Fetch error:", error);
      });
    } else {
      toast.error("User ID and Topic ID are required!");
      navigate("/"); // Redirect to home or login if missing
    }
  }, [userId, topicId, navigate]);
  useEffect(() => {
    if (!editor && !contentLoaded && webpageContent !== null) {
      initializeEditor();
    } else if (editor && webpageContent && !contentLoaded) {
      // Update editor with new content when webpageContent changes
      editor.setComponents(webpageContent);
      setContentLoaded(true);
      console.log("Webpage content updated:", webpageContent);
    }
  }, [editor, webpageContent, contentLoaded]);
  const fetchWebpageContent = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/get_webpage?user_id=${userId}&topic_id=${topicId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (response.data.error) {
        console.warn("No webpage content found:", response.data.error);
        setWebpageContent(`<div class="max-w-4xl mx-auto px-4 py-8"><h1 class="text-4xl font-bold mb-6">Untitled</h1><div class="prose prose-lg">Start editing...</div></div>`);
        toast.info("No saved webpage content found, starting with default.");
      } else if (response.data.html_content) {
        setWebpageContent(response.data.html_content);
        toast.success("Webpage content loaded successfully!");
      }
    } catch (error) {
      console.error("Fetch webpage content error:", error);
      setWebpageContent(`<div class="max-w-4xl mx-auto px-4 py-8"><h1 class="text-4xl font-bold mb-6">Untitled</h1><div class="prose prose-lg">Start editing...</div></div>`);
      toast.error("Failed to fetch webpage content, using default state");
    } finally {
      setIsLoading(false);
    }
  };
  const initializeEditor = () => {
    const editorInstance = grapesjs.init({
      container: "#gjs",
      height: "70vh",
      width: "auto",
      storageManager: false,
      plugins: [grapesjsTailwind, grapesjsBlocksBasic],
      pluginsOpts: {
        [grapesjsTailwind]: {
          // Customize Tailwind options if needed (refer to repo for advanced options)
          blocks: [
            "hero",
            "feature",
            "pricing",
            "team",
            "faq",
            "stats",
            "steps",
            "testimonials",
            "call-to-action",
            "footer",
          ], // Example blocks from Tailblocks.cc
        },
        [grapesjsBlocksBasic]: {},
      },
      canvas: {
        styles: [
          "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css", // Tailwind CSS
          "https://unpkg.com/grapesjs/dist/css/grapes.min.css", // GrapesJS default styles
        ],
      },
      selectorManager: {
        escapeName: (name) => `${name}`.trim().replace(/([^a-z0-9\w-:/]+)/gi, "-"), // Handle Tailwind class names with slashes
      },
    });
    editorInstance.on("component:add", (component: any) => {
      component.set({ resizable: true, draggable: true });
    });
    // Add custom upload button to toolbar
    editorInstance.Panels.addPanel({
      id: "custom-upload-panel",
      el: ".gjs-pn-commands",
      visible: true,
      buttons: [
        {
          id: "upload-image",
          active: false,
          className: "fa fa-upload",
          command: "upload-image",
          attributes: { title: "Upload Image to S3" },
        },
      ],
    });
    // Command to handle image upload
    editorInstance.Commands.add("upload-image", {
      run: (editor: any) => {
        console.log("Upload image command triggered");
        const modal = editor.Modal;
        const container = document.createElement("div");
        container.innerHTML = `
          <div style="padding: 20px;">
            <h3>Upload Image to S3</h3>
            <input type="file" id="gjs-custom-upload" accept="image/*" style="margin: 10px 0;" />
            <button id="gjs-custom-upload-btn" style="padding: 5px 10px; background: #007bff; color: white; border: none; border-radius: 3px;">Upload</button>
          </div>
        `;
        const input = container.querySelector("#gjs-custom-upload") as HTMLInputElement;
        const uploadBtn = container.querySelector("#gjs-custom-upload-btn") as HTMLButtonElement;
        uploadBtn.onclick = async () => {
          const file = input.files?.[0];
          if (file) {
            console.log("File selected for upload:", file.name, "Size:", file.size, "Type:", file.type);
            const formData = new FormData();
            formData.append("image", file);
            formData.append("user_id", userId || "");
            formData.append("topic_id", topicId || "");
            setIsLoading(true);
            try {
              const response = await axios.post(`${API_URL}/upload_image_to_s3`, formData, {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                  "Content-Type": "multipart/form-data",
                },
                timeout: 120000,
              });
              console.log("Upload response:", response.data);
              if (response.data.image_url) {
                const url = response.data.image_url;
                editor.addComponents(`
                  <img src="${url}" alt="${file.name}" class="max-w-full h-auto rounded-lg shadow-lg my-8"/>
                `);
                toast.success("Image uploaded to S3 and added to editor!");
                modal.close();
              } else {
                toast.error("Failed to upload image to S3: No image_url in response");
              }
            } catch (error) {
              console.error("Upload error details:", {
                message: error.message,
                response: error.response ? error.response.data : "No response",
                status: error.response ? error.response.status : "N/A",
              });
              toast.error("Error uploading image to S3: " + (error.response?.data?.error || error.message));
            } finally {
              setIsLoading(false);
            }
          } else {
            toast.error("No file selected");
          }
        };
        modal.open({
          title: "Upload Image",
          content: container,
        }).onceClose(() => {
          container.remove();
        });
      },
    });
    setEditor(editorInstance);
    editorInstance.Commands.add("generate-or-modify", {
      run: (editor: any) => {
        if (!modifyPrompt) {
          toast.error("Please enter a prompt!");
          return;
        }
        generateOrModifyContent(modifyPrompt);
      },
    });
    editorInstance.Panels.addPanel({
      id: "custom-panel",
      visible: true,
      buttons: [
        {
          id: "generate-or-modify",
          className: "fa fa-edit",
          command: "generate-or-modify",
          attributes: { title: "Generate/Modify Content in Selected Container" },
        },
      ],
    });
    // Initialize with current webpageContent or default
    const initialContent = webpageContent || `<div class="max-w-4xl mx-auto px-4 py-8"><h1 class="text-4xl font-bold mb-6">Untitled</h1><div class="prose prose-lg">Start editing...</div></div>`;
    editorInstance.setComponents(initialContent);
    setContentLoaded(true);
    console.log("Editor initialized with:", initialContent);
    // Add Tailwind CSS extraction command (optional)
    editorInstance.Commands.add("get-tailwindCss", {
      run: (editor: any, sender: any, options: any = {}) => {
        const css = editor.getCss();
        console.log("Extracted Tailwind CSS:", css);
        // Optionally, save or use the CSS as needed
      },
    });
  };
  const generateOrModifyContent = async (prompt: string) => {
    if (!userId || !topicId) {
      toast.error("User ID and Topic ID are required!");
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/generate`,
        { user_id: userId, topic_id: topicId, prompt, content: getSelectedBlockContent() },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      if (response.data.error) {
        toast.error(response.data.error);
      } else {
        const { content } = response.data;
        setBlogContent((prev) => ({ ...prev, body: content }));
        const selectedComponent = editor.getSelected();
        if (selectedComponent) {
          if (typeof selectedComponent.replaceWith === "function") {
            const newComponent = editor.addComponents(content)[0];
            selectedComponent.replaceWith(newComponent);
            toast.success("Content generated/modified in selected container!");
          } else if (typeof selectedComponent.components === "function") {
            selectedComponent.components().reset();
            selectedComponent.append(content);
            toast.success("Content generated/modified in selected container!");
          } else if (typeof selectedComponent.setContent === "function") {
            selectedComponent.setContent(content);
            toast.success("Content generated/modified in selected container!");
          } else {
            console.warn("Selected component does not support content modification. Falling back to editor update.");
            editor.setComponents(content);
            toast.success("Content generated/modified in editor!");
          }
        } else {
          editor.setComponents(content);
          toast.success("Content generated/modified in editor!");
        }
      }
    } catch (error) {
      console.error("Generate/modify error:", error);
      toast.error("Failed to generate/modify content");
    } finally {
      setIsLoading(false);
    }
  };
  const getSelectedBlockContent = () => {
    const selectedComponent = editor.getSelected();
    if (selectedComponent) {
      if (typeof selectedComponent.getHtml === "function") {
        return selectedComponent.getHtml();
      }
      if (typeof selectedComponent.get === "function") {
        return selectedComponent.get("content") || selectedComponent.get("html") || selectedComponent.toHTML();
      }
      return selectedComponent.toHTML ? selectedComponent.toHTML() : "";
    }
    return "";
  };
  const saveWebpage = async () => {
    if (!editor) return;
    const htmlContent = editor.getHtml();
    const fullHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${blogContent?.title || "Webpage"}</title><style>${editor.getCss()}</style></head><body>${htmlContent}</body></html>`;
    try {
      setIsLoading(true);
      const response = await axios.post(
        `${API_URL}/save_webpage`,
        { user_id: userId, topic_id: topicId, html_content: fullHtml },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      if (response.data.success) {
        setWebpageContent(fullHtml); // Update state with saved content
        toast.success("Webpage saved successfully!");
      } else {
        toast.error("Failed to save webpage");
      }
    } catch (error) {
      console.error("Save webpage error:", error);
      toast.error("Error saving webpage");
    } finally {
      setIsLoading(false);
    }
  };
  const handleHost = async () => {
    if (!editor) return;
    setIsLoading(true);
    try {
      const htmlContent = `<!DOCTYPE html><html lang="en"><head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${blogContent?.title || "Webpage"}</title>
        <meta property="og:title" content="${blogContent?.title || "Webpage"}">
        <meta property="og:description" content="${blogContent?.intro || "Check out this webpage created with our editor!"}">
        <meta property="og:image" content="${generatedImage || "https://via.placeholder.com/1200x627?text=Preview+Image"}">
        <meta property="og:type" content="website">
        <style>${editor.getCss()}</style>
      </head><body>${editor.getHtml()}</body></html>`;
      const response = await axios.post(
        `${API_URL}/upload_to_s3`,
        { user_id: userId, topic_id: topicId, html_content: htmlContent },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      if (response.data.s3_url) {
        const finalHostedUrl = response.data.s3_url;
        setHostedUrl(finalHostedUrl);
        const updatedHtmlContent = htmlContent.replace(
          "</head>",
          `<meta property="og:url" content="${finalHostedUrl}"></head>`
        );
        await axios.post(
          `${API_URL}/upload_to_s3`,
          { user_id: userId, topic_id: topicId, html_content: updatedHtmlContent },
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        toast.success("Webpage hosted successfully!");
      } else {
        toast.error("Failed to upload webpage");
      }
    } catch (error) {
      console.error("Host webpage error:", error);
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
      const response = await axios.post(
        `${API_URL}/generate_image`,
        { prompt: imagePrompt },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      if (response.data.image_url) {
        setGeneratedImage(response.data.image_url);
        toast.success("Image generated successfully!");
      }
    } catch (error) {
      console.error("Generate image error:", error);
      toast.error("Failed to generate image");
    } finally {
      setIsLoading(false);
    }
  };
  const uploadLocalImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast.error("No file selected");
      return;
    }
    const formData = new FormData();
    formData.append("image", file);
    formData.append("user_id", userId || "");
    formData.append("topic_id", topicId || "");
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/upload_image_to_s3`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "multipart/form-data",
        },
        timeout: 120000,
      });
      if (response.data.image_url) {
        const url = response.data.image_url;
        editor.addComponents(`
          <img src="${url}" alt="Uploaded Image" class="max-w-full h-auto rounded-lg shadow-lg my-8"/>
        `);
        toast.success("Image uploaded and added to editor!");
      } else {
        toast.error("Failed to upload image to S3");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Error uploading image to S3");
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Reset file input
      }
    }
  };
  const addImageToEditor = () => {
    if (editor && generatedImage) {
      editor.addComponents(`
        <img src="${generatedImage}" alt="AI Generated Image" class="max-w-full h-auto rounded-lg shadow-lg my-8"/>
      `);
      toast.success("Image added to editor");
    }
  };
  const generateAITemplate = async () => {
    if (!userId || !topicId) {
      toast.error("User ID and Topic ID are required!");
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/generate_template`,
        { user_id: userId, topic_id: topicId, additional_prompt: additionalPrompt },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      if (response.data.html) {
        editor.setComponents(response.data.html);
        toast.success("AI template generated successfully!");
      }
    } catch (error) {
      console.error("Generate AI template error:", error);
      toast.error("Failed to generate AI template");
    } finally {
      setIsLoading(false);
    }
  };
  const shareOnPlatform = (platform: string) => {
    if (!hostedUrl) {
      toast.error("Please host the page first!");
      return;
    }
    let shareUrl = "";
    const title = blogContent?.title || "Check out my webpage!";
    const description = blogContent?.intro || "Created with our editor!";
    const encodedUrl = encodeURIComponent(hostedUrl);
    if (platform === "linkedin") {
      shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    } else if (platform === "twitter") {
      shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${title}\n${description}\n${hostedUrl}`)}`;
    }
    window.open(shareUrl, "_blank", "noopener,noreferrer");
    toast.success(`Opening ${platform === "linkedin" ? "LinkedIn" : "Twitter"} sharing dialog`);
    setSharePlatform(null);
  };
  const previewWebpage = () => {
    if (!editor) return;
    const htmlContent = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${blogContent?.title || "Preview"}</title><style>${editor.getCss()}</style></head><body>${editor.getHtml()}</body></html>`;
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };
  const exportHtml = () => {
    if (!editor) return;
    const htmlContent = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${blogContent?.title || "Webpage"}</title><style>${editor.getCss()}</style></head><body>${editor.getHtml()}</body></html>`;
    const blob = new Blob([htmlContent], { type: "text/html" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${blogContent?.title || "webpage"}.html`;
    link.click();
    toast.success("HTML exported successfully!");
  };
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
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
              onClick={() => setUseBlogGenerator(!useBlogGenerator)}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <FileText className="h-4 w-4 mr-2" />
              {useBlogGenerator ? "Hide Blog Generator" : "Generate/Modify"}
            </button>
            <button
              onClick={saveWebpage}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Webpage
            </button>
            <button
              onClick={previewWebpage}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </button>
            <button
              onClick={exportHtml}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Export HTML
            </button>
          </div>
        </div>
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
        {useAIImage && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <input
              type="text"
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="Enter image prompt..."
              className="w-full px-4 py-2 border rounded-md mb-2"
            />
            <div className="flex gap-4 mb-2">
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
            <input
              type="file"
              ref={fileInputRef}
              onChange={uploadLocalImage}
              accept="image/*"
              className="hidden"
              id="localImageUpload"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : "Upload Local Image"}
            </button>
            {generatedImage && <img src={generatedImage} alt="AI Generated" className="max-w-full h-auto rounded-lg shadow-sm mt-2" />}
          </div>
        )}
        {useBlogGenerator && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <textarea
              value={modifyPrompt}
              onChange={(e) => setModifyPrompt(e.target.value)}
              placeholder="Enter prompt to generate or modify content..."
              className="w-full px-4 py-2 border rounded-md h-24 resize-none"
            />
            <button
              onClick={() => generateOrModifyContent(modifyPrompt)}
              disabled={isLoading}
              className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : "Generate/Modify Content"}
            </button>
            <p className="text-sm text-gray-500">Select a container or box and use the toolbar button (edit icon) or button above to generate/modify content.</p>
          </div>
        )}
        <div id="gjs" className="border rounded-lg min-h-[70vh]"></div>
        <div className="flex justify-end mt-6">
          <button
            onClick={handleHost}
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? "Hosting..." : "Host Webpage"}
          </button>
        </div>
        {hostedUrl && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Webpage Hosted!</h3>
            <div className="flex items-center justify-between">
              <a href={hostedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                {hostedUrl}
              </a>
              <div className="relative">
                <button
                  onClick={() => setSharePlatform(sharePlatform ? null : "linkedin")}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-[#0A66C2] rounded-md hover:bg-[#004182]"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </button>
                {sharePlatform && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                    <button
                      onClick={() => shareOnPlatform("linkedin")}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-md"
                    >
                      <Linkedin className="h-4 w-4 mr-2" /> LinkedIn
                    </button>
                    <button
                      onClick={() => shareOnPlatform("twitter")}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-b-md"
                    >
                      <Twitter className="h-4 w-4 mr-2" /> Twitter
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default WebpageEditor;
