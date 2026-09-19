sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (
    Controller,
    JSONModel,
    MessageToast,
    MessageBox
) {
    "use strict";

    return Controller.extend(
        "com.flighttracking.zflighttracking.controller.StandardFlights",
        {

            onInit: function () {
                var oModel = new JSONModel({
                    results: [],
                    allResults: [],
                    totalCount: 0,
                    lastUpdated: "Not loaded yet"
                });

                this.getView().setModel(
                    oModel,
                    "standardFlights"
                );

                this._loadStandardFlights();
            },


            /*
             * LOAD SAP STANDARD FLIGHTS
             */
            onRefresh: function () {
                this._loadStandardFlights();
            },


            _loadStandardFlights: function () {
                var oODataModel =
                    this.getOwnerComponent().getModel();

                var oStandardModel =
                    this.getView().getModel(
                        "standardFlights"
                    );

                var oView = this.getView();

                if (!oODataModel) {
                    MessageBox.error(
                        "OData model is not available."
                    );
                    return;
                }

                oView.setBusy(true);

                oODataModel.read(
                    "/StandardFlightSet",
                    {
                        success: function (oData) {
                            var aFlights =
                                oData.results || [];

                            aFlights.forEach(
                                function (oFlight) {

                                    /*
                                     * Read occupied seats.
                                     *
                                     * Your generated OData property
                                     * currently uses Seats0cc
                                     * with zero 0.
                                     */
                                    var iSeatsMax =
                                        Number(
                                            oFlight.SeatsMax
                                        ) || 0;

                                    var iSeatsOcc =
                                        Number(
                                            oFlight.Seats0cc
                                        ) || 0;

                                    var iAvailable =
                                        Number(
                                            oFlight.AvailableSeats
                                        ) || 0;


                                    oFlight.OccupiedSeats =
                                        iSeatsOcc;


                                    /*
                                     * DISPLAY DATE
                                     */
                                    oFlight.DateDisplay =
                                        this._formatDate(
                                            oFlight.Fldate
                                        );


                                    /*
                                     * DISPLAY TIMES
                                     */
                                    oFlight.DepTimeDisplay =
                                        this._formatTime(
                                            oFlight.DepTime
                                        );

                                    oFlight.ArrTimeDisplay =
                                        this._formatTime(
                                            oFlight.ArrTime
                                        );


                                    /*
                                     * ROUTE
                                     */
                                    oFlight.DepartureDisplay =
                                        this._buildAirportDisplay(
                                            oFlight.CityFrom,
                                            oFlight.AirpFrom
                                        );

                                    oFlight.ArrivalDisplay =
                                        this._buildAirportDisplay(
                                            oFlight.CityTo,
                                            oFlight.AirpTo
                                        );


                                    /*
                                     * FLIGHT NUMBER
                                     */
                                    oFlight.FlightNumber =
                                        (
                                            oFlight.Carrid +
                                            " " +
                                            oFlight.Connid
                                        );


                                    /*
                                     * OCCUPANCY
                                     */
                                    if (iSeatsMax > 0) {
                                        oFlight.OccupancyPercent =
                                            Math.round(
                                                (
                                                    iSeatsOcc /
                                                    iSeatsMax
                                                ) * 100
                                            );
                                    } else {
                                        oFlight.OccupancyPercent =
                                            0;
                                    }


                                    /*
                                     * AVAILABLE SEAT STATE
                                     */
                                    oFlight.AvailabilityState =
                                        this._getAvailabilityState(
                                            iAvailable,
                                            iSeatsMax
                                        );


                                    /*
                                     * PRICE DISPLAY
                                     */
                                    oFlight.PriceDisplay =
                                        this._formatPrice(
                                            oFlight.Price,
                                            oFlight.Currency
                                        );

                                }.bind(this)
                            );


                            oStandardModel.setProperty(
                                "/results",
                                aFlights
                            );

                            oStandardModel.setProperty(
                                "/allResults",
                                aFlights.slice()
                            );

                            oStandardModel.setProperty(
                                "/totalCount",
                                aFlights.length
                            );

                            oStandardModel.setProperty(
                                "/lastUpdated",
                                new Date().toLocaleString()
                            );

                            oView.setBusy(false);

                            MessageToast.show(
                                aFlights.length +
                                " SAP standard flights loaded."
                            );

                        }.bind(this),


                        error: function () {
                            oView.setBusy(false);

                            MessageBox.error(
                                "Unable to load SAP Standard Flight data."
                            );
                        }
                    }
                );
            },


            /*
             * SEARCH
             */
            onSearch: function (oEvent) {
                var sQuery =
                    oEvent
                        .getParameter("newValue") ||
                    oEvent
                        .getParameter("query") ||
                    "";

                sQuery =
                    sQuery
                        .trim()
                        .toLowerCase();

                var oModel =
                    this.getView()
                        .getModel(
                            "standardFlights"
                        );

                var aAllFlights =
                    oModel.getProperty(
                        "/allResults"
                    ) || [];


                if (!sQuery) {
                    oModel.setProperty(
                        "/results",
                        aAllFlights.slice()
                    );

                    return;
                }


                var aFiltered =
                    aAllFlights.filter(
                        function (oFlight) {

                            var aValues = [
                                oFlight.Carrid,
                                oFlight.Carrname,
                                oFlight.Connid,
                                oFlight.FlightNumber,
                                oFlight.Fldate,
                                oFlight.DateDisplay,
                                oFlight.CityFrom,
                                oFlight.AirpFrom,
                                oFlight.CityTo,
                                oFlight.AirpTo,
                                oFlight.PlaneType,
                                oFlight.Currency
                            ];

                            return aValues.some(
                                function (sValue) {
                                    return (
                                        sValue &&
                                        String(sValue)
                                            .toLowerCase()
                                            .indexOf(
                                                sQuery
                                            ) !== -1
                                    );
                                }
                            );
                        }
                    );

                oModel.setProperty(
                    "/results",
                    aFiltered
                );
            },


            /*
             * NAVIGATION
             */
            onNavBack: function () {
                this.getOwnerComponent()
                    .getRouter()
                    .navTo(
                        "RouteFlightTracking",
                        {},
                        true
                    );
            },


            /*
             * HELPERS
             */
            _formatDate: function (sDate) {
                if (
                    !sDate ||
                    String(sDate).length !== 8
                ) {
                    return sDate || "";
                }

                var sValue =
                    String(sDate);

                var iYear =
                    Number(
                        sValue.substring(
                            0,
                            4
                        )
                    );

                var iMonth =
                    Number(
                        sValue.substring(
                            4,
                            6
                        )
                    ) - 1;

                var iDay =
                    Number(
                        sValue.substring(
                            6,
                            8
                        )
                    );

                var oDate =
                    new Date(
                        iYear,
                        iMonth,
                        iDay
                    );

                return oDate.toLocaleDateString(
                    undefined,
                    {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                    }
                );
            },


            _formatTime: function (vTime) {
                if (!vTime) {
                    return "";
                }

                /*
                 * OData V2 can provide Edm.Time as
                 * either PT11H00M00S or an object
                 * containing milliseconds.
                 */

                if (
                    typeof vTime ===
                    "object"
                ) {

                    if (
                        typeof vTime.ms ===
                        "number"
                    ) {
                        var iHours =
                            Math.floor(
                                vTime.ms /
                                3600000
                            );

                        var iMinutes =
                            Math.floor(
                                (
                                    vTime.ms %
                                    3600000
                                ) /
                                60000
                            );

                        return (
                            this._pad2(
                                iHours
                            ) +
                            ":" +
                            this._pad2(
                                iMinutes
                            )
                        );
                    }
                }


                var sTime =
                    String(vTime);

                var oMatch =
                    sTime.match(
                        /PT(\d+)H(\d+)M(\d+)S/
                    );

                if (oMatch) {
                    return (
                        this._pad2(
                            Number(
                                oMatch[1]
                            )
                        ) +
                        ":" +
                        this._pad2(
                            Number(
                                oMatch[2]
                            )
                        )
                    );
                }

                return sTime;
            },


            _pad2: function (iValue) {
                return (
                    iValue < 10
                        ? "0" + iValue
                        : String(iValue)
                );
            },


            _buildAirportDisplay: function (
                sCity,
                sAirport
            ) {
                if (
                    sCity &&
                    sAirport
                ) {
                    return (
                        sCity +
                        " (" +
                        sAirport +
                        ")"
                    );
                }

                return (
                    sCity ||
                    sAirport ||
                    ""
                );
            },


            _formatPrice: function (
                vPrice,
                sCurrency
            ) {
                var fPrice =
                    Number(vPrice);

                if (
                    isNaN(fPrice)
                ) {
                    return (
                        String(
                            vPrice || ""
                        ) +
                        " " +
                        (
                            sCurrency ||
                            ""
                        )
                    ).trim();
                }

                return (
                    fPrice.toFixed(2) +
                    " " +
                    (
                        sCurrency ||
                        ""
                    )
                ).trim();
            },


            _getAvailabilityState: function (
                iAvailable,
                iSeatsMax
            ) {
                if (
                    iSeatsMax <= 0
                ) {
                    return "None";
                }

                var fPercent =
                    (
                        iAvailable /
                        iSeatsMax
                    ) * 100;

                if (fPercent <= 5) {
                    return "Error";
                }

                if (fPercent <= 15) {
                    return "Warning";
                }

                return "Success";
            }

        }
    );
});