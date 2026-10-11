import { SpeedReaderModel } from "./js/model.js?v=2";
import { SpeedReaderView } from "./js/view.js?v=2";
import { SpeedReaderController } from "./js/controller.js?v=2";

const model = new SpeedReaderModel();
const view = new SpeedReaderView();
const controller = new SpeedReaderController(model, view);

controller.initialize();
