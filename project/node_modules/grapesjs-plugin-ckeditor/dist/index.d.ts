import CKE from 'ckeditor4';
import { CustomRTE, Plugin } from 'grapesjs';

export type PluginOptions = {
	/**
	 * CKEditor's configuration options.
	 * @see https://ckeditor.com/docs/ckeditor4/latest/api/CKEDITOR_config.html
	 * @default {}
	 */
	options?: CKE.config;
	/**
	 * Pass CKEDITOR constructor or the CDN string from which the CKEDITOR will be loaded.
	 * If this option is empty, the plugin will also check the global scope (eg. window.CKEDITOR)
	 * @default 'https://cdn.ckeditor.com/4.21.0/standard-all/ckeditor.js'
	 */
	ckeditor?: CKE.CKEditorStatic | string;
	/**
	 * Position side of the toolbar.
	 * @default 'left'
	 */
	position?: "left" | "center" | "right";
	/**
	 * Extend the default customRTE interface.
	 * @see https://grapesjs.com/docs/guides/Replace-Rich-Text-Editor.html
	 * @default {}
	 * @example
	 * customRte: { parseContent: true, ... },
	 */
	customRte?: Partial<CustomRTE>;
	/**
	 * Customize CKEditor toolbar element once created.
	 * @example
	 * onToolbar: (el) => {
	 *  el.style.minWidth = '350px';
	 * }
	 */
	onToolbar?: (toolbar: HTMLElement) => void;
};
declare const plugin: Plugin<PluginOptions>;

export {
	plugin as default,
};

export {};
