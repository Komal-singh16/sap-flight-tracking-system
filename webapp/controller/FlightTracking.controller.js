sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (
    Controller,
    MessageToast,
    MessageBox,
    JSONModel,
    Filter,
    FilterOperator
) {
    "use strict";

    return Controller.extend(
        "com.flighttracking.zflighttracking.controller.FlightTracking",
        {
            onInit: function () {
                var oFlightModel = this.getOwnerComponent().getModel("flights");

                if (!oFlightModel) {
                    oFlightModel = new JSONModel({
                        results: [],
                        count: 0,
                        filteredCount: 0,
                        onTimeCount: 0,
                        delayedCount: 0,
                        cancelledCount: 0,
                        departedCount: 0,
                        landedCount: 0,
                        onTimePercent: 0,
                        delayedPercent: 0,
                        cancelledPercent: 0,
                        selectedFlight: {},
                        lastUpdated: "Not loaded yet",
                        autoRefresh: false
                    });

                    this.getOwnerComponent().setModel(oFlightModel, "flights");
                }

                this.getView().setModel(
                    new JSONModel(this._getInitialCreateFlightData()),
                    "createFlight"
                );

                this._sSearchQuery = "";
                this._sStatusFilter = "ALL";
                this._autoRefreshTimer = null;
            },

            onLoadFlights: function () {
                this._loadFlights(false);
            },

            _loadFlights: function (bSilent) {
                var oODataModel = this.getOwnerComponent().getModel();
                var oFlightModel = this.getOwnerComponent().getModel("flights");
                var oView = this.getView();

                if (!oODataModel) {
                    MessageBox.error("OData model is not available.");
                    return;
                }

                if (!bSilent) {
                    oView.setBusy(true);
                }

                oODataModel.read("/ZFLIGHTSet", {
                    success: function (oData) {
                        var aFlights = oData.results || [];
                        var iOnTime = 0;
                        var iDelayed = 0;
                        var iCancelled = 0;
                        var iDeparted = 0;
                        var iLanded = 0;

                        aFlights.forEach(function (oFlight) {
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
                                oFlight.DistanceKm = "N/A";
                            }

                            switch (oFlight.FlightStatus) {
                                case "ON TIME":
                                    iOnTime += 1;
                                    break;

                                case "DELAYED":
                                    iDelayed += 1;
                                    break;

                                case "CANCELLED":
                                    iCancelled += 1;
                                    break;

                                case "DEPARTED":
                                    iDeparted += 1;
                                    break;

                                case "LANDED":
                                    iLanded += 1;
                                    break;

                                default:
                                    break;
                            }
                        }.bind(this));

                        var iTotal = aFlights.length;

                        oFlightModel.setData({
                            results:
                                aFlights,

                            count:
                                iTotal,

                            filteredCount:
                                iTotal,

                            onTimeCount:
                                iOnTime,

                            delayedCount:
                                iDelayed,

                            cancelledCount:
                                iCancelled,

                            departedCount:
                                iDeparted,

                            landedCount:
                                iLanded,

                            onTimePercent:
                                iTotal > 0
                                    ? (iOnTime / iTotal) * 100
                                    : 0,

                            delayedPercent:
                                iTotal > 0
                                    ? (iDelayed / iTotal) * 100
                                    : 0,

                            cancelledPercent:
                                iTotal > 0
                                    ? (iCancelled / iTotal) * 100
                                    : 0,

                            selectedFlight:
                                oFlightModel.getProperty(
                                    "/selectedFlight"
                                ) || {},

                            lastUpdated:
                                new Date().toLocaleString(),

                            autoRefresh:
                                Boolean(
                                    oFlightModel.getProperty(
                                        "/autoRefresh"
                                    )
                                )
                        });

                        this._applyFilters();

                        oView.setBusy(false);

                        if (!bSilent) {
                            MessageToast.show(
                                iTotal +
                                " flight records loaded successfully."
                            );
                        }
                    }.bind(this),

                    error: function () {
                        oView.setBusy(false);

                        if (!bSilent) {
                            MessageBox.error(
                                "Unable to load flight data from SAP backend."
                            );
                        }
                    }
                });
            },

            onSearchFlights: function (oEvent) {
                this._sSearchQuery =
                    oEvent.getParameter("newValue") || "";

                this._applyFilters();
            },

            onStatusFilterChange: function (oEvent) {
                this._sStatusFilter =
                    oEvent.getSource().getSelectedKey();

                this._applyFilters();
            },

            onShowAllFlights: function () {
                this._setStatusFilter("ALL");
            },

            onShowOnTimeFlights: function () {
                this._setStatusFilter("ON TIME");
            },

            onShowDelayedFlights: function () {
                this._setStatusFilter("DELAYED");
            },

            onShowCancelledFlights: function () {
                this._setStatusFilter("CANCELLED");
            },

            _setStatusFilter: function (sStatus) {
                var oSelect =
                    this.byId("statusFilterSelect");

                this._sStatusFilter =
                    sStatus;

                if (oSelect) {
                    oSelect.setSelectedKey(
                        sStatus
                    );
                }

                this._applyFilters();
            },

            _applyFilters: function () {
                var oTable =
                    this.byId("flightTable");

                var oBinding;
                var aFilters = [];

                if (!oTable) {
                    return;
                }

                oBinding =
                    oTable.getBinding("items");

                if (!oBinding) {
                    return;
                }

                if (this._sSearchQuery) {
                    var sQuery =
                        this._sSearchQuery
                            .trim()
                            .toLowerCase();

                    if (sQuery) {
                        var fnContains =
                            function (sValue) {
                                return Boolean(
                                    sValue &&
                                    String(sValue)
                                        .toLowerCase()
                                        .indexOf(sQuery) !== -1
                                );
                            };

                        aFilters.push(
                            new Filter({
                                filters: [
                                    new Filter({
                                        path: "FlightId",
                                        test: fnContains
                                    }),

                                    new Filter({
                                        path: "AirlineCode",
                                        test: fnContains
                                    }),

                                    new Filter({
                                        path: "AirlineName",
                                        test: fnContains
                                    }),

                                    new Filter({
                                        path: "DepCity",
                                        test: fnContains
                                    }),

                                    new Filter({
                                        path: "ArrCity",
                                        test: fnContains
                                    }),

                                    new Filter({
                                        path: "FlightStatus",
                                        test: fnContains
                                    })
                                ],
                                and: false
                            })
                        );
                    }
                }

                if (
                    this._sStatusFilter &&
                    this._sStatusFilter !== "ALL"
                ) {
                    aFilters.push(
                        new Filter(
                            "FlightStatus",
                            FilterOperator.EQ,
                            this._sStatusFilter
                        )
                    );
                }

                oBinding.filter(aFilters);

                this.getOwnerComponent()
                    .getModel("flights")
                    .setProperty(
                        "/filteredCount",
                        oBinding.getLength()
                    );
            },

            onFlightPress: function (oEvent) {
                var oContext =
                    oEvent
                        .getSource()
                        .getBindingContext("flights");

                var oFlight;

                if (!oContext) {
                    return;
                }

                oFlight =
                    oContext.getObject();

                this.getOwnerComponent()
                    .getModel("flights")
                    .setProperty(
                        "/selectedFlight",
                        oFlight
                    );

                this.getOwnerComponent()
                    .getRouter()
                    .navTo(
                        "RouteFlightDetails",
                        {
                            flightId:
                                oFlight.FlightId
                        }
                    );
            },

            onAutoRefreshChange: function (oEvent) {
                var bEnabled =
                    oEvent.getParameter("state");

                this.getOwnerComponent()
                    .getModel("flights")
                    .setProperty(
                        "/autoRefresh",
                        bEnabled
                    );

                if (bEnabled) {
                    if (this._autoRefreshTimer) {
                        clearInterval(
                            this._autoRefreshTimer
                        );
                    }

                    this._autoRefreshTimer =
                        setInterval(
                            function () {
                                this._loadFlights(true);
                            }.bind(this),
                            30000
                        );

                    MessageToast.show(
                        "Auto-refresh enabled: every 30 seconds."
                    );

                } else {
                    if (this._autoRefreshTimer) {
                        clearInterval(
                            this._autoRefreshTimer
                        );

                        this._autoRefreshTimer =
                            null;
                    }

                    MessageToast.show(
                        "Auto-refresh disabled."
                    );
                }
            },

            onOpenCreateFlightDialog: function () {
                this._resetCreateFlightModel();

                this.byId(
                    "createFlightDialog"
                ).open();
            },

            onCancelCreateFlight: function () {
                this.byId(
                    "createFlightDialog"
                ).close();
            },

            onCreateFlightDialogAfterClose: function () {
                this._resetCreateFlightModel();
            },

            onAddBookingRow: function () {
                var oCreateModel =
                    this.getView()
                        .getModel("createFlight");

                var aBookings =
                    oCreateModel
                        .getProperty("/bookings") || [];

                aBookings =
                    aBookings.slice();

                aBookings.push(
                    this._getEmptyBooking()
                );

                oCreateModel.setProperty(
                    "/bookings",
                    aBookings
                );

                MessageToast.show(
                    "New booking row added."
                );
            },

            onRemoveBookingRow: function (oEvent) {
                var oCreateModel =
                    this.getView()
                        .getModel("createFlight");

                var aBookings =
                    oCreateModel
                        .getProperty("/bookings") || [];

                var oContext;
                var sPath;
                var aParts;
                var iIndex;

                if (aBookings.length <= 1) {
                    MessageToast.show(
                        "At least one booking is required."
                    );

                    return;
                }

                oContext =
                    oEvent
                        .getSource()
                        .getBindingContext(
                            "createFlight"
                        );

                if (!oContext) {
                    return;
                }

                sPath =
                    oContext.getPath();

                aParts =
                    sPath.split("/");

                iIndex =
                    parseInt(
                        aParts[
                            aParts.length - 1
                        ],
                        10
                    );

                if (isNaN(iIndex)) {
                    return;
                }

                aBookings =
                    aBookings.slice();

                aBookings.splice(
                    iIndex,
                    1
                );

                oCreateModel.setProperty(
                    "/bookings",
                    aBookings
                );
            },

            onCreateDeepFlight: function () {
                var oODataModel =
                    this.getOwnerComponent()
                        .getModel();

                var oCreateModel =
                    this.getView()
                        .getModel("createFlight");

                var oDialog =
                    this.byId(
                        "createFlightDialog"
                    );

                var oData =
                    oCreateModel.getData();

                var sValidationMessage;
                var sFlightId;
                var aZBookings;
                var oPayload;

                if (!oODataModel) {
                    MessageBox.error(
                        "OData model is not available."
                    );

                    return;
                }

                sValidationMessage =
                    this._validateCreateFlightData(
                        oData
                    );

                if (sValidationMessage) {
                    MessageBox.warning(
                        sValidationMessage
                    );

                    return;
                }

                sFlightId =
                    this._cleanValue(
                        oData.FlightId
                    );

                aZBookings =
                    oData.bookings.map(
                        function (oBooking) {
                            return {
                                BookId:
                                    this._cleanValue(
                                        oBooking.BookId
                                    ),

                                FlightId:
                                    sFlightId,

                                PassId:
                                    this._cleanValue(
                                        oBooking.PassId
                                    ),

                                SeatNo:
                                    this._cleanValue(
                                        oBooking.SeatNo
                                    ),

                                BookingDate:
                                    this._cleanValue(
                                        oBooking.BookingDate
                                    )
                            };
                        }.bind(this)
                    );

                oPayload = {
                    FlightId:
                        sFlightId,

                    AirlineCode:
                        this._cleanValue(
                            oData.AirlineCode
                        ),

                    DepCity:
                        this._cleanValue(
                            oData.DepCity
                        ),

                    ArrCity:
                        this._cleanValue(
                            oData.ArrCity
                        ),

                    FlightStatus:
                        this._cleanValue(
                            oData.FlightStatus
                        ),

                    ZBookings:
                        aZBookings
                };

                oDialog.setBusy(true);

                oODataModel.create(
                    "/ZFLIGHTSet",
                    oPayload,
                    {
                        success: function () {
                            oDialog.setBusy(false);

                            oDialog.close();

                            MessageBox.success(
                                "Flight " +
                                sFlightId +
                                " and " +
                                aZBookings.length +
                                " booking(s) were created successfully.",
                                {
                                    title:
                                        "Deep Insert Successful"
                                }
                            );

                            this._loadFlights(
                                true
                            );

                        }.bind(this),

                        error: function (oError) {
                            oDialog.setBusy(false);

                            MessageBox.error(
                                this._getODataErrorMessage(
                                    oError
                                ),
                                {
                                    title:
                                        "Unable to Create Flight"
                                }
                            );

                        }.bind(this)
                    }
                );
            },

            _validateCreateFlightData: function (oData) {
                var sFlightId =
                    this._cleanValue(
                        oData.FlightId
                    );

                var sAirlineCode =
                    this._cleanValue(
                        oData.AirlineCode
                    );

                var sDepCity =
                    this._cleanValue(
                        oData.DepCity
                    );

                var sArrCity =
                    this._cleanValue(
                        oData.ArrCity
                    );

                var sStatus =
                    this._cleanValue(
                        oData.FlightStatus
                    );

                var aBookings =
                    oData.bookings || [];

                var mBookingIds = {};
                var i;

                if (!sFlightId) {
                    return "Flight ID is required.";
                }

                if (!sAirlineCode) {
                    return "Airline Code is required.";
                }

                if (!sDepCity) {
                    return "Departure City is required.";
                }

                if (!sArrCity) {
                    return "Arrival City is required.";
                }

                if (!sStatus) {
                    return "Flight Status is required.";
                }

                if (!aBookings.length) {
                    return "Add at least one booking.";
                }

                for (
                    i = 0;
                    i < aBookings.length;
                    i += 1
                ) {
                    var oBooking =
                        aBookings[i];

                    var sBookId =
                        this._cleanValue(
                            oBooking.BookId
                        );

                    var sPassId =
                        this._cleanValue(
                            oBooking.PassId
                        );

                    var sSeatNo =
                        this._cleanValue(
                            oBooking.SeatNo
                        );

                    var sBookingDate =
                        this._cleanValue(
                            oBooking.BookingDate
                        );

                    if (!sBookId) {
                        return (
                            "Booking ID is required in row " +
                            (i + 1) +
                            "."
                        );
                    }

                    if (mBookingIds[sBookId]) {
                        return (
                            "Booking ID " +
                            sBookId +
                            " is duplicated."
                        );
                    }

                    mBookingIds[sBookId] =
                        true;

                    if (!sPassId) {
                        return (
                            "Passenger ID is required in booking row " +
                            (i + 1) +
                            "."
                        );
                    }

                    if (!sSeatNo) {
                        return (
                            "Seat Number is required in booking row " +
                            (i + 1) +
                            "."
                        );
                    }

                    if (
                        !/^\d{8}$/.test(
                            sBookingDate
                        )
                    ) {
                        return (
                            "Booking Date in row " +
                            (i + 1) +
                            " must be YYYYMMDD."
                        );
                    }
                }

                return "";
            },

            _getInitialCreateFlightData: function () {
                return {
                    FlightId: "",
                    AirlineCode: "",
                    DepCity: "",
                    ArrCity: "",
                    FlightStatus: "ON TIME",
                    bookings: [
                        this._getEmptyBooking()
                    ]
                };
            },

            _getEmptyBooking: function () {
                return {
                    BookId: "",
                    FlightId: "",
                    PassId: "",
                    SeatNo: "",
                    BookingDate:
                        this._getTodayBackendDate()
                };
            },

            _resetCreateFlightModel: function () {
                var oCreateModel =
                    this.getView()
                        .getModel(
                            "createFlight"
                        );

                if (!oCreateModel) {
                    this.getView().setModel(
                        new JSONModel(
                            this._getInitialCreateFlightData()
                        ),
                        "createFlight"
                    );

                    return;
                }

                oCreateModel.setData(
                    this._getInitialCreateFlightData()
                );
            },

            _getTodayBackendDate: function () {
                var oDate =
                    new Date();

                var sYear =
                    String(
                        oDate.getFullYear()
                    );

                var sMonth =
                    String(
                        oDate.getMonth() + 1
                    );

                var sDay =
                    String(
                        oDate.getDate()
                    );

                if (sMonth.length < 2) {
                    sMonth =
                        "0" + sMonth;
                }

                if (sDay.length < 2) {
                    sDay =
                        "0" + sDay;
                }

                return (
                    sYear +
                    sMonth +
                    sDay
                );
            },

            _cleanValue: function (vValue) {
                return String(
                    vValue === null ||
                    vValue === undefined
                        ? ""
                        : vValue
                ).trim();
            },

            _getODataErrorMessage: function (oError) {
                var sDefaultMessage =
                    "SAP backend rejected the Deep Insert request.";

                if (!oError) {
                    return sDefaultMessage;
                }

                try {
                    var oResponse =
                        JSON.parse(
                            oError.responseText ||
                            "{}"
                        );

                    if (
                        oResponse &&
                        oResponse.error &&
                        oResponse.error.message &&
                        oResponse.error.message.value
                    ) {
                        return (
                            oResponse.error.message.value
                        );
                    }

                } catch (oParseError) {
                    // fallback below
                }

                if (oError.message) {
                    return oError.message;
                }

                return sDefaultMessage;
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
            },

            onOpenStandardFlights: function () {
                this.getOwnerComponent()
                    .getRouter()
                    .navTo(
                        "RouteStandardFlights"
                    );
            },

            onExit: function () {
                if (this._autoRefreshTimer) {
                    clearInterval(
                        this._autoRefreshTimer
                    );

                    this._autoRefreshTimer =
                        null;
                }
            }
        }
    );
});