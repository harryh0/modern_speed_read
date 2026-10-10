import { SpeedReaderModel } from "./js/model.js";
import { SpeedReaderView } from "./js/view.js";
import { SpeedReaderController } from "./js/controller.js";

const model = new SpeedReaderModel();
const view = new SpeedReaderView();
const controller = new SpeedReaderController(model, view);

controller.initialize();
