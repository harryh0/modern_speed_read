const version = new URL(import.meta.url).searchParams.get("v");
const [
  { SpeedReaderModel },
  { SpeedReaderView },
  { SpeedReaderController }
] = await Promise.all([
  import(`./js/model.js?v=${version}`),
  import(`./js/view.js?v=${version}`),
  import(`./js/controller.js?v=${version}`)
]);

const model = new SpeedReaderModel();
const view = new SpeedReaderView();
const controller = new SpeedReaderController(model, view);

controller.initialize();
