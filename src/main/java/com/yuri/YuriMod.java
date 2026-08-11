//main file to load the mod it intilizes mod
package com.yuri;

import com.yuri.command.YuriCommands;
import com.yuri.companion.YuriCompanionController;
import com.yuri.sensing.YuriWorldSensor;
import com.yuri.backend.YuriBackendClient;
import com.yuri.events.YuriEventPublisher;
import com.yuri.actions.YuriActionExecutor;
import net.fabricmc.api.ModInitializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class YuriMod implements ModInitializer {
	public static final String MOD_ID = "yuri";
	public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

	@Override
	public void onInitialize() {
		LOGGER.info("Yuri mod initialized.");

		YuriCompanionController companionController = new YuriCompanionController(); //controls movment etc and begaviour of yuri
		YuriWorldSensor worldSensor = new YuriWorldSensor();// yyri knows whats near him nearBycontext()
		YuriBackendClient backendClient = new YuriBackendClient(); // sends updates to and states to backend evry 5 second
		YuriActionExecutor actionExecutor = new YuriActionExecutor(companionController); // executes backend actions
		YuriEventPublisher eventPublisher = new YuriEventPublisher(backendClient, worldSensor, actionExecutor);//sends events and states alos if getten events will tell action executor
		YuriCommands commands = new YuriCommands(companionController, worldSensor, backendClient, actionExecutor);//spwan commands etc yuri uses

		commands.register();
		companionController.registerEvents();
		eventPublisher.registerEvents();
	}
}
