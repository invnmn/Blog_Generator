import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { Loader2, Share2, Image as ImageIcon, Layout, Linkedin, Save, Eye, Download, FileText } from "lucide-react";
import grapesjs from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";
import grapesjsPresetWebpage from "grapesjs-preset-webpage";
import grapesjsPluginCKEditor from "grapesjs-plugin-ckeditor";
import grapesjsBlocksBasic from "grapesjs-blocks-basic";

// Temporary storage for local content
let tempLocalContent: string | null = null;

function WebpageEditor() {
  const navigate = useNavigate();
  const { topicId } = useParams();
  const userId = localStorage.getItem("userId");
  const [editor, setEditor] = useState<any>(null);
  const [blogContent, setBlogContent] = useState<any>(null);
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
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  useEffect(() => {
    if (userId && topicId) {
      fetchBlogContent();
      fetchWebpageContent(); // Fetch content when topicId changes
    } else {
      toast.error("User ID and Topic ID are required!");
      navigate("/"); // Redirect to home or login if missing
    }
  }, [userId, topicId, navigate]); // Trigger on topicId change

  useEffect(() => {
    if (!editor && (blogContent || tempLocalContent || !contentLoaded) && !contentLoaded) {
      initializeEditor();
    }
  }, [blogContent, editor, contentLoaded, tempLocalContent]);

  const fetchBlogContent = async () => {
    try {
      const response = await axios.get(`${API_URL}/get_blog?user_id=${userId}&topic_id=${topicId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (response.data.error) {
        console.warn("No blog content found:", response.data.error);
        setBlogContent({ title: "", intro: "", body: "" }); // Default empty content
      } else {
        const { title, intro, body } = response.data;
        setBlogContent({ title, intro, body });
      }
    } catch (error) {
      console.error("Fetch blog content error:", error);
      setBlogContent({ title: "", intro: "", body: "" }); // Fallback to empty content
      toast.error("Failed to fetch blog content, using default state");
    }
  };

  const fetchWebpageContent = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/get_webpage?user_id=${userId}&topic_id=${topicId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (response.data.error) {
        console.warn("No webpage content found:", response.data.error);
        tempLocalContent = `<div class="max-w-4xl mx-auto px-4 py-8"><h1 class="text-4xl font-bold mb-6">Untitled</h1><div class="prose prose-lg">Start editing...</div></div>`;
        toast.info("No saved webpage content found, starting with default.");
      } else if (response.data.html_content) {
        tempLocalContent = response.data.html_content;
        toast.success("Webpage content loaded successfully!");
      }
    } catch (error) {
      console.error("Fetch webpage content error:", error);
      tempLocalContent = `<div class="max-w-4xl mx-auto px-4 py-8"><h1 class="text-4xl font-bold mb-6">Untitled</h1><div class="prose prose-lg">Start editing...</div></div>`;
      toast.error("Failed to fetch webpage content, using default state");
    } finally {
      setIsLoading(false);
      // Trigger editor reinitialization if already initialized
      if (editor && !contentLoaded) {
        editor.setComponents(tempLocalContent || '');
        setContentLoaded(true);
      }
    }
  };

  const initializeEditor = () => {
    const editorInstance = grapesjs.init({
      container: "#gjs",
      height: "70vh",
      width: "auto",
      storageManager: false,
      // plugins: [grapesjsPresetWebpage, grapesjsPluginCKEditor, grapesjsBlocksBasic],
      // pluginsOpts: {
      //   [grapesjsPresetWebpage]: { navbar: false },
      //   [grapesjsPluginCKEditor]: {
      //     options: {
      //       language: "en",
      //       customConfig: '/ckeditor4/ckeditor.js',
      //       basePath: '/ckeditor4/',
      //     },
      //   },
      //   [grapesjsBlocksBasic]: {},
      // },
      canvas: {
        styles: ["https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css"],
      },
    });

    editorInstance.on("component:add", (component: any) => {
      component.set({ resizable: true, draggable: true });
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

    // Set initial content based on fetched html_content
    if (tempLocalContent && !contentLoaded) {
      editorInstance.setComponents(tempLocalContent);
      setContentLoaded(true);
    } else if (blogContent && !contentLoaded) {
      const blogHtml = `
        <div class="max-w-4xl mx-auto px-4 py-8">
          <h1 class="text-4xl font-bold mb-6">${blogContent.title || "Untitled"}</h1>
          <div class="prose prose-lg">${blogContent.intro || "Start editing..."}</div>
          <div class="mt-8 prose prose-lg">${blogContent.body || ""}</div>
        </div>
      `;
      editorInstance.setComponents(blogHtml);
      setContentLoaded(true);
    } else {
      editorInstance.setComponents('<div class="max-w-4xl mx-auto px-4 py-8"><h1 class="text-4xl font-bold mb-6">Untitled</h1><div class="prose prose-lg">Start editing...</div></div>');
      setContentLoaded(true);
    }
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
        { 
          user_id: userId, 
          topic_id: topicId, 
          prompt, 
          content: getSelectedBlockContent() // Send only the selected block's content
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );

      if (response.data.error) {
        toast.error(response.data.error);
      } else {
        const { content } = response.data; // Assuming backend returns a single 'content' string
        setBlogContent((prev) => ({ ...prev, body: content })); // Update only the body if needed

        // Get the selected component (container or box)
        const selectedComponent = editor.getSelected();
        if (selectedComponent) {
          // Replace the selected component with the new content
          if (typeof selectedComponent.replaceWith === "function") {
            const newComponent = editor.addComponents(content)[0]; // Add new content
            selectedComponent.replaceWith(newComponent);
            toast.success("Content generated/modified in selected container!");
          } else if (typeof selectedComponent.components === "function") {
            selectedComponent.components().reset();
            selectedComponent.append(content); // Use append for string content
            toast.success("Content generated/modify in selected container!");
          } else if (typeof selectedComponent.setContent === "function") {
            selectedComponent.setContent(content);
            toast.success("Content generated/modified in selected container!");
          } else {
            console.warn("Selected component does not support content modification. Falling back to editor update.");
            editor.setComponents(content);
            toast.success("Content generated/modified in editor!");
          }
        } else {
          // If no container is selected, set the entire editor content
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

  // Helper function to get the content of the selected block
  const getSelectedBlockContent = () => {
    const selectedComponent = editor.getSelected();
    if (selectedComponent) {
      // Try to get the HTML content of the selected component
      if (typeof selectedComponent.getHtml === "function") {
        return selectedComponent.getHtml();
      }
      // Fallback to get the inner content as a string
      if (typeof selectedComponent.get === "function") {
        return selectedComponent.get("content") || selectedComponent.get("html") || selectedComponent.toHTML();
      }
      // Last resort: convert the component to HTML
      return selectedComponent.toHTML ? selectedComponent.toHTML() : "";
    }
    return ""; // Return empty string if no component is selected
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
        tempLocalContent = fullHtml;
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

  const shareOnLinkedIn = () => {
    if (!hostedUrl) {
      toast.error("Please host the page first!");
      return;
    }

    const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(hostedUrl)}`;
    window.open(linkedInShareUrl, "_blank", "noopener,noreferrer");
    toast.success("Opening LinkedIn sharing dialog");
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