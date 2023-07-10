import * as p from "@clack/prompts";
import color from "picocolors";
import { transform } from "@swc/core";
import { readFile, writeFile } from "fs/promises";
import { exec } from "child_process";
import { detect } from "detect-package-manager";
const resolvePluginConfig = (
	packageName: string
): [string, string, boolean] | null => {
	switch (packageName.toLowerCase()) {
		case "unocss":
			return ["UnoCss", "unocss/vite", true];
		case "other_plugin":
			return ["Other_Plugin", "other_plugin/vite", false];
		default:
			return null;
	}
};
async function main() {
	console.clear();
	p.intro(`${color.bgCyan(color.black(" Solid-CLI "))}`);
	const depsToAdd = (await p.multiselect({
		options: [
			{
				value: "unocss",
				label: "UnoCSS",
				hint: "Utility Class CSS library, similar to Tailwind",
			},
			{
				value: "other_plugin",
				label: "Other_Plugin",
				hint: "Does a more different thing",
			},
		],
		message: "What would you like to add",
		required: true,
	})) as string[];
	const configData = (await readFile("vite.config.ts")).toString();
	// Windows path hack. Not sure if this'll work on other platforms
	const wasm_path = new URL("test_plugin.wasm", import.meta.url).pathname.slice(
		1
	);
	const extra_plugins = depsToAdd.map((dep) => resolvePluginConfig(dep));
	const res = await transform(configData, {
		filename: "vite.config.ts",
		jsc: {
			parser: {
				syntax: "typescript",
				tsx: false,
			},
			target: "es2022",
			experimental: {
				plugins: [
					[
						wasm_path,
						{
							additional_plugins: extra_plugins,
						},
					],
				],
			},
		},
	});
	await writeFile("vite.config.ts", res.code);
	p.log.success("Updated config");
	p.log.info("Detecting package manager");
	const manager = await detect();
	p.log.success(`Package manager detected as ${manager}`);
	p.log.info("Updating packages...");
	for (const plugin of extra_plugins) {
		if (!plugin) continue;
		const res = await new Promise((res) =>
			exec(`${manager} i ${plugin[0].toLowerCase()}`, res)
		);
		console.log(res);
		p.log.info(`Installed ${plugin[0]}`);
	}
	p.log.success("Packages installed");
}

main().catch(console.error);
