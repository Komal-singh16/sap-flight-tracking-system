sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel"
], function (
    Controller,
    MessageToast,
    JSONModel
) {
    "use strict";

    return Controller.extend(
        "com.flighttracking.zflighttracking.controller.FlightDetails",
        {
            onInit: function () {
                this.getView().setModel(
                    new JSONModel({
                        bookings: [],
                        bookingCount: 0,
                        bookingCountText: "0 Bookings",
                        bookingsBusy: false
                    }),
                    "details"
                );

                this.getOwnerComponent()
                    .getRouter()
                    .getRoute(
                        "RouteFlightDetails"
                    )
                    .attachPatternMatched(
                        this._onRouteMatched,
                        this
                    );
            },

            _onRouteMatched: function (oEvent) {
                var sFlightId =
                    oEvent
                        .getParameter(
                            "arguments"
                        )
                        .flightId;

                var oFlightModel =
                    this.getOwnerComponent()
                        .getModel(
                            "flights"
                        );

                var oDetailsModel =
                    this.getView()
                        .getModel(
                            "details"
                        );

                var aFlights;
                var oFlight;

                oDetailsModel.setData({
                    bookings: [],
                    bookingCount: 0,
                    bookingCountText:
                        "0 Bookings",
                    bookingsBusy:
                        false
                });

                if (!oFlightModel) {
                    oFlightModel =
                        new JSONModel({
                            results: [],
                            selectedFlight: {}
                        });

                    this.getOwnerComponent()
                        .setModel(
                            oFlightModel,
                            "flights"
                        );
                }

                aFlights =
                    oFlightModel
                        .getProperty(
                            "/results"
                        ) || [];

                oFlight =
                    this._findFlightById(
                        aFlights,
                        sFlightId
                    );

                if (oFlight) {
                    oFlightModel.setProperty(
                        "/selectedFlight",
                        oFlight
                    );

                    this._loadBookings(
                        sFlightId
                    );

                    return;
                }

                this._loadSingleFlight(
                    sFlightId
                );
            },

            _findFlightById: function (
                aFlights,
                sFlightId
            ) {
                var i;

                for (
                    i = 0;
                    i < aFlights.length;
                    i += 1
                ) {
                    if (
                        aFlights[i].FlightId ===
                        sFlightId
                    ) {
                        return aFlights[i];
                    }
                }

                return null;
            },

            _loadSingleFlight: function (sFlightId) {
                var oODataModel =
                    this.getOwnerComponent()
                        .getModel();

                var oFlightModel =
                    this.getOwnerComponent()
                        .getModel(
                            "flights"
                        );

                var sFlightPath;

                if (!oODataModel) {
                    MessageToast.show(
                        "OData model is not available."
                    );

                    this.onNavBack();

                    return;
                }

                sFlightPath =
                    "/" +
                    oODataModel.createKey(
                        "ZFLIGHTSet",
                        {
                            FlightId:
                                sFlightId
                        }
                    );

                this.getView()
                    .setBusy(true);

                oODataModel.read(
                    sFlightPath,
                    {
                        success:
                            function (
                                oFlight
                            ) {
                                this._enrichFlight(
                                    oFlight
                                );

                                oFlightModel
                                    .setProperty(
                                        "/selectedFlight",
                                        oFlight
                                    );

                                this.getView()
                                    .setBusy(
                                        false
                                    );

                                this._loadBookings(
                                    sFlightId
                                );

                            }.bind(this),

                        error:
                            function () {
                                this.getView()
                                    .setBusy(
                                        false
                                    );

                                MessageToast.show(
                                    "Flight details could not be loaded."
                                );

                                this.onNavBack();

                            }.bind(this)
                    }
                );
            },

            _loadBookings: function (sFlightId) {
                var oODataModel =
                    this.getOwnerComponent()
                        .getModel();

                var oDetailsModel =
                    this.getView()
                        .getModel(
                            "details"
                        );

                var sFlightPath;
                var sBookingsPath;

                if (!oODataModel) {
                    MessageToast.show(
                        "OData model is not available."
                    );

                    return;
                }

                oDetailsModel.setProperty(
                    "/bookingsBusy",
                    true
                );

                sFlightPath =
                    "/" +
                    oODataModel.createKey(
                        "ZFLIGHTSet",
                        {
                            FlightId:
                                sFlightId
                        }
                    );

                sBookingsPath =
                    sFlightPath +
                    "/ZBookings";

                oODataModel.read(
                    sBookingsPath,
                    {
                        success:
                            function (oData) {
                                var aBookings =
                                    oData.results ||
                                    [];

                                var iBookingCount;

                                aBookings.forEach(
                                    function (
                                        oBooking
                                    ) {
                                        oBooking.BookingDateDisplay =
                                            this._formatBookingDate(
                                                oBooking.BookingDate
                                            );

                                    }.bind(this)
                                );

                                iBookingCount =
                                    aBookings.length;

                                oDetailsModel
                                    .setProperty(
                                        "/bookings",
                                        aBookings
                                    );

                                oDetailsModel
                                    .setProperty(
                                        "/bookingCount",
                                        iBookingCount
                                    );

                                oDetailsModel
                                    .setProperty(
                                        "/bookingCountText",
                                        iBookingCount === 1
                                            ? "1 Booking"
                                            : iBookingCount +
                                              " Bookings"
                                    );

                                oDetailsModel
                                    .setProperty(
                                        "/bookingsBusy",
                                        false
                                    );

                            }.bind(this),

                        error:
                            function () {
                                oDetailsModel
                                    .setProperty(
                                        "/bookings",
                                        []
                                    );

                                oDetailsModel
                                    .setProperty(
                                        "/bookingCount",
                                        0
                                    );

                                oDetailsModel
                                    .setProperty(
                                        "/bookingCountText",
                                        "0 Bookings"
                                    );

                                oDetailsModel
                                    .setProperty(
                                        "/bookingsBusy",
                                        false
                                    );

                                MessageToast.show(
                                    "Bookings could not be loaded."
                                );
                            }
                    }
                );
            },

            onRefreshBookings: function () {
                var oFlightModel =
                    this.getOwnerComponent()
                        .getModel(
                            "flights"
                        );

                var sFlightId;

                if (!oFlightModel) {
                    return;
                }

                sFlightId =
                    oFlightModel.getProperty(
                        "/selectedFlight/FlightId"
                    );

                if (!sFlightId) {
                    MessageToast.show(
                        "No flight is selected."
                    );

                    return;
                }

                this._loadBookings(
                    sFlightId
                );
            },

            _formatBookingDate: function (sDate) {
                sDate =
                    sDate
                        ? String(sDate)
                        : "";

                if (!sDate) {
                    return "";
                }

                if (
                    !/^\d{8}$/.test(
                        sDate
                    )
                ) {
                    return sDate;
                }

                return (
                    sDate.substring(
                        0,
                        4
                    ) +
                    "-" +
                    sDate.substring(
                        4,
                        6
                    ) +
                    "-" +
                    sDate.substring(
                        6,
                        8
                    )
                );
            },

            _enrichFlight: function (oFlight) {
                var oDeparture;
                var oArrival;
                var oDepCoordinates;
                var oArrCoordinates;

                oFlight.StatusState =
                    this._getStatusState(
                        oFlight.FlightStatus
                    );

                oFlight.AirlineName =
                    this._getAirlineName(
                        oFlight.AirlineCode
                    );

                oDeparture =
                    this._parseCity(
                        oFlight.DepCity
                    );

                oArrival =
                    this._parseCity(
                        oFlight.ArrCity
                    );

                oFlight.DepCityName =
                    oDeparture.city;

                oFlight.DepAirportCode =
                    oDeparture.code;

                oFlight.ArrCityName =
                    oArrival.city;

                oFlight.ArrAirportCode =
                    oArrival.code;

                oDepCoordinates =
                    this._getAirportCoordinates(
                        oDeparture.code
                    );

                oArrCoordinates =
                    this._getAirportCoordinates(
                        oArrival.code
                    );

                if (
                    oDepCoordinates &&
                    oArrCoordinates
                ) {
                    oFlight.DistanceKm =
                        Math.round(
                            this._calculateDistanceKm(
                                oDepCoordinates.lat,
                                oDepCoordinates.lng,
                                oArrCoordinates.lat,
                                oArrCoordinates.lng
                            )
                        );

                } else {
                    oFlight.DistanceKm =
                        "N/A";
                }
            },

            onNavBack: function () {
                this.getOwnerComponent()
                    .getRouter()
                    .navTo(
                        "RouteFlightTracking",
                        {},
                        true
                    );
            },

            _getAirlineName: function (sCode) {
                switch (sCode) {
                    case "AI":
                        return "Air India";

                    case "6E":
                        return "IndiGo";

                    case "UK":
                        return "Vistara";

                    case "QP":
                        return "Akasa Air";

                    case "SG":
                        return "SpiceJet";

                    case "AA":
                        return "American Airlines";

                    default:
                        return (
                            sCode ||
                            "Unknown Airline"
                        );
                }
            },

            _parseCity: function (sValue) {
                var oMatch;

                if (!sValue) {
                    return {
                        city: "",
                        code: ""
                    };
                }

                oMatch =
                    String(sValue).match(
                        /^(.*?)\s*\((.*?)\)\s*$/
                    );

                if (oMatch) {
                    return {
                        city:
                            oMatch[1]
                                .trim(),

                        code:
                            oMatch[2]
                                .trim()
                                .toUpperCase()
                    };
                }

                return {
                    city:
                        String(sValue),

                    code:
                        ""
                };
            },

            _getAirportCoordinates: function (sCode) {
                var mAirports = {
                    DEL: {
                        lat: 28.5562,
                        lng: 77.1000
                    },

                    BOM: {
                        lat: 19.0896,
                        lng: 72.8656
                    },

                    BLR: {
                        lat: 13.1986,
                        lng: 77.7066
                    },

                    CCU: {
                        lat: 22.6547,
                        lng: 88.4467
                    },

                    MAA: {
                        lat: 12.9941,
                        lng: 80.1709
                    },

                    HYD: {
                        lat: 17.2403,
                        lng: 78.4294
                    },

                    PNQ: {
                        lat: 18.5821,
                        lng: 73.9197
                    },

                    AMD: {
                        lat: 23.0772,
                        lng: 72.6347
                    },

                    JFK: {
                        lat: 40.6413,
                        lng: -73.7781
                    },

                    SFO: {
                        lat: 37.6213,
                        lng: -122.3790
                    }
                };

                return (
                    mAirports[sCode] ||
                    null
                );
            },

            _calculateDistanceKm: function (
                fLat1,
                fLng1,
                fLat2,
                fLng2
            ) {
                var fEarthRadius =
                    6371;

                var fLatDifference =
                    this._toRadians(
                        fLat2 -
                        fLat1
                    );

                var fLngDifference =
                    this._toRadians(
                        fLng2 -
                        fLng1
                    );

                var fA =
                    Math.sin(
                        fLatDifference / 2
                    ) *
                    Math.sin(
                        fLatDifference / 2
                    ) +

                    Math.cos(
                        this._toRadians(
                            fLat1
                        )
                    ) *

                    Math.cos(
                        this._toRadians(
                            fLat2
                        )
                    ) *

                    Math.sin(
                        fLngDifference / 2
                    ) *

                    Math.sin(
                        fLngDifference / 2
                    );

                var fC =
                    2 *
                    Math.atan2(
                        Math.sqrt(fA),
                        Math.sqrt(1 - fA)
                    );

                return (
                    fEarthRadius *
                    fC
                );
            },

            _toRadians: function (fDegrees) {
                return (
                    fDegrees *
                    Math.PI /
                    180
                );
            },

            _getStatusState: function (sStatus) {
                switch (sStatus) {
                    case "ON TIME":
                        return "Success";

                    case "DELAYED":
                        return "Warning";

                    case "CANCELLED":
                        return "Error";

                    case "LANDED":
                        return "Success";

                    case "DEPARTED":
                        return "Information";

                    default:
                        return "None";
                }
            }
        }
    );
});