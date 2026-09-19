import Constants, { ExecutionEnvironment } from "expo-constants";

/** Expo Go omits this project's custom/native integration modules. */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
