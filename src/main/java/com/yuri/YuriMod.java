package com.yuri;

import com.yuri.command.YuriCommands;
import com.yuri.companion.YuriCompanionController;
import com.yuri.sensing.YuriWorldSensor;
import com.yuri.backend.YuriBackendClient;
import net.fabricmc.api.ModInitializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class YuriMod implements ModInitializer {
	public static final String MOD_ID = "yuri";
	public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

	@Override
	public void onInitialize() {
		LOGGER.info("Yuri mod initialized.");

		YuriCompanionController companionController = new YuriCompanionController();
		YuriWorldSensor worldSensor = new YuriWorldSensor();
		YuriBackendClient backendClient = new YuriBackendClient();
		YuriCommands commands = new YuriCommands(companionController, worldSensor, backendClient);

		commands.register();
		companionController.registerEvents();
	}
}
