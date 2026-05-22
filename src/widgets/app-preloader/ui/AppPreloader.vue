<template>
    <div style="width: 100vw; height: 100vh; display: flex; justify-content: center; align-items: center;">
        <svg width="400" height="200" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
            <!-- Единая линия с зацикленной анимацией -->
            <path
                d="
                M 50 100
                C 50 40, 150 40, 150 100
                C 150 160, 250 160, 250 100
                C 250 40, 350 40, 350 100
                C 350 160, 250 160, 250 100
                C 250 40, 150 40, 150 100
                C 150 160, 50 160, 50 100
                M 150 100
                C 150 40, 250 40, 250 100
                "
                fill="none"
                stroke="currentColor"
                stroke-width="8"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-dasharray="450"
                stroke-dashoffset="450"
            >
                <!-- Зацикленная анимация: рисуем и стираем линию -->
                <animate
                attributeName="stroke-dashoffset"
                dur="2.5s"
                values="450;0;450"
                keyTimes="0;0.5;1"
                repeatCount="indefinite"
                fill="freeze"
                />
            </path>

        </svg>
    </div>
</template>