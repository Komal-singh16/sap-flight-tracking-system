/*global QUnit*/

sap.ui.define([
	"com/flighttracking/zflighttracking/controller/FlightTracking.controller"
], function (Controller) {
	"use strict";

	QUnit.module("FlightTracking Controller");

	QUnit.test("I should test the FlightTracking controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
