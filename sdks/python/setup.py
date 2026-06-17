from setuptools import setup, find_packages

setup(
    name="memox-sdk",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "httpx>=0.20.0",
    ],
    author="memox team",
    description="Python client SDK for memox, the universal polyglot memory bridge for AI agents",
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.8",
)
