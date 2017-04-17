module.exports = pluginLoaderFactory;

function pluginLoaderFactory(probot, opts = {}) {
  if (!probot) {
    throw new TypeError('expected probot instance');
  }

  // We could eventually support a different base dir to load plugins from.
  const basedir = opts.basedir || process.cwd();
  // These are mostly to ease testing
  const autoloader = opts.autoloader || require('load-plugins');
  const resolver = opts.resolver || require('resolve').sync;

  /**
   * Resolves a plugin by name from the basedir
   * @param {string} pluginName - Module name of plugin
   */
  function resolvePlugin(pluginName) {
    try {
      return resolver(pluginName, {basedir});
    } catch (err) {
      err.message = `Failed to resolve plugin "${pluginName}". Is it installed?
  Original error message:
  ${err.message}`;
      throw err;
    }
  }

  /**
   * Load a plugin via filepath or function
   * @param {string} pluginName - Plugin name (for error messaging)
   * @param {string|Function} plugin - Path to plugin module or function
   */
  function loadPlugin(pluginName, plugin) {
    try {
      probot.load(typeof plugin === 'string' ? require(plugin) : plugin);
    } catch (err) {
      err.message = `Failed to load plugin "${pluginName}". This is a problem with the plugin itself; not probot.
  Original error message:
  ${err.message}`;
      throw err;
    }
  }

  /**
   * Loads all accessible plugin modules beginning with "probot-"
   */
  function autoload() {
    const plugins = autoloader('probot-*');
    Object.keys(plugins).forEach(pluginName => {
      loadPlugin(pluginName, plugins[pluginName]);
      probot.robot.log.info(`Automatically loaded plugin: ${pluginName}`);
    });
  }

  /**
   * Loads an explicit list of plugin modules
   * @param {string[]} [pluginNames=[]] - List of plugin module names
   */
  function load(pluginNames = []) {
    pluginNames.forEach(pluginName => {
      const pluginPath = resolvePlugin(pluginName);
      loadPlugin(pluginName, pluginPath);
      probot.robot.log.debug(`Loaded plugin: ${pluginName}`);
    });
  }

  return {load, autoload};
}
